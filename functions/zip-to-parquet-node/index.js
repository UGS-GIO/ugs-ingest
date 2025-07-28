const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const gdal = require('gdal-async');
const yauzl = require('yauzl');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Configuration constants
const FUNCTION_TIMEOUT = 500000; // 8+ minutes in milliseconds
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB limit

// Initialize clients
const storage = new Storage();
const outputBucketName = process.env.OUTPUT_BUCKET || 'stagedparquet';

// Validate bucket name
if (!outputBucketName) {
  throw new Error('OUTPUT_BUCKET environment variable is required');
}

// Register the CloudEvent function
functions.cloudEvent('convertToGeoparquetNode', async (cloudEvent) => {
  const startTime = Date.now();
  
  // Debug: log the entire cloudEvent structure
  console.log('🐛 CloudEvent received:', JSON.stringify(cloudEvent, null, 2));
  
  // Handle the event data structure for Cloud Storage events
  const file = cloudEvent.data || {};
  const bucketName = file.bucket || cloudEvent.source?.split('/buckets/')[1]?.split('/')[0];
  const fileName = file.name;

  console.log(`🚀 Starting conversion: ${fileName || 'undefined'} (${file.size || 'undefined'} bytes)`);
  console.log(`Event ID: ${cloudEvent.id || 'undefined'}`);
  console.log(`Event Type: ${cloudEvent.type || 'undefined'}`);
  console.log(`Bucket: ${bucketName || 'undefined'}`);

  // Basic validation
  if (!fileName || !fileName.toLowerCase().endsWith('.zip')) {
    console.log(`⏭️  File ${fileName} is not a zip file. Skipping.`);
    return;
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    console.error(`❌ File too large: ${fileName} (${file.size} bytes > ${MAX_FILE_SIZE} bytes)`);
    return;
  }

  console.log(`📁 Processing file: ${fileName} from bucket: ${bucketName}`);

  const tempDir = os.tmpdir();
  const localZipPath = path.join(tempDir, fileName);
  
  // These will be set after checking driver availability
  let outputFileName, tempOutputPath, outputFormat, outputExtension, formatOptions;

  try {
    // 1. Download the zip file to a temporary location
    console.log(`⬇️  Downloading ${fileName}...`);
    await storage.bucket(bucketName).file(fileName).download({ destination: localZipPath });
    console.log(`✅ Download complete`);

    // 2. Inspect the zip file to find the source data
    console.log(`🔍 Inspecting zip file contents...`);
    const sourceDataPathInZip = await findSourceInZip(localZipPath);
    if (!sourceDataPathInZip) {
      console.log(`❌ No convertible data source (GDB, Shapefile, CSV) found in ${fileName}`);
      return;
    }
    
    // Construct the full virtual path for GDAL
    const gdalInputPath = `/vsizip/${localZipPath}/${sourceDataPathInZip}`;
    console.log(`📂 Found source data: ${gdalInputPath}`);
    
    // 3. Check available drivers and determine output format
    console.log(`🔍 Checking available GDAL drivers...`);
    const drivers = gdal.drivers.getNames();
    console.log(`📋 Available drivers: ${drivers.slice(0, 10).join(', ')}... (${drivers.length} total)`);
    
    const hasParquetDriver = drivers.includes('Parquet');
    console.log(`🎯 Parquet driver available: ${hasParquetDriver}`);
    
    let outputFormat, outputExtension, formatOptions;
    if (hasParquetDriver) {
      console.log(`⚙️  Using Parquet format with GDAL configuration...`);
      gdal.config.set('OGR_PARQUET_ALLOW_ALL_DIMS', 'YES');
      outputFormat = 'Parquet';
      outputExtension = '.parquet';
      formatOptions = [
        '-f', 'Parquet',
        '-makevalid',
        '-lco', 'COMPRESSION=SNAPPY',
        '-lco', 'EDGES=PLANAR',
        '-lco', 'GEOMETRY_ENCODING=WKB',
        '-lco', 'GEOMETRY_NAME=geometry',
        '-lco', 'ROW_GROUP_SIZE=65536'
      ];
    } else {
      console.log(`⚠️  Parquet driver not available, falling back to GeoJSON...`);
      outputFormat = 'GeoJSON';
      outputExtension = '.geojson';
      formatOptions = [
        '-f', 'GeoJSON',
        '-makevalid'
      ];
    }
    
    // Set output file paths now that we know the extension
    outputFileName = `${path.basename(fileName, '.zip')}${outputExtension}`;
    tempOutputPath = path.join(tempDir, outputFileName);
    
    // 4. Try system ogr2ogr first, fallback to Node.js GDAL
    console.log(`🔄 Attempting conversion with system ogr2ogr...`);
    
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // First try Parquet with system ogr2ogr
      const ogr2ogrCmd = `ogr2ogr -f Parquet "${tempOutputPath.replace('.geojson', '.parquet')}" "${gdalInputPath}" --config OGR_PARQUET_ALLOW_ALL_DIMS YES -makevalid -lco COMPRESSION=SNAPPY -lco EDGES=PLANAR -lco GEOMETRY_ENCODING=WKB -lco GEOMETRY_NAME=geometry -lco ROW_GROUP_SIZE=65536`;
      
      console.log(`🔧 Running: ${ogr2ogrCmd}`);
      await execAsync(ogr2ogrCmd);
      
      // Update paths for successful Parquet conversion
      outputFormat = 'Parquet';
      outputExtension = '.parquet';
      outputFileName = `${path.basename(fileName, '.zip')}.parquet`;
      tempOutputPath = path.join(tempDir, outputFileName);
      
      console.log(`✅ System ogr2ogr successful - Parquet format used`);
      
    } catch (ogrError) {
      console.log(`⚠️  System ogr2ogr failed: ${ogrError.message}`);
      console.log(`🔄 Falling back to Node.js GDAL with available drivers...`);
      
      // Fall back to Node.js GDAL approach
      const inputDataset = await gdal.openAsync(gdalInputPath);
      console.log(`📊 Dataset opened successfully. Layers: ${inputDataset.layers.count()}`);
      
      await gdal.vectorTranslateAsync(tempOutputPath, inputDataset, formatOptions);
    }
    
    // Verify output file was created
    const stats = await fs.stat(tempOutputPath);
    console.log(`💾 ${outputFormat} file created successfully: ${stats.size} bytes`);

    // 5. Upload the resulting Parquet file to the output bucket
    console.log(`⬆️  Uploading ${outputFileName} to bucket ${outputBucketName}...`);
    await storage.bucket(outputBucketName).upload(tempOutputPath, {
      destination: outputFileName,
    });
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Conversion completed successfully in ${processingTime}ms`);
    console.log(`📊 Final stats: Input: ${fileName} (${file.size} bytes) -> Output: ${outputFileName} (${stats.size} bytes)`);

  } catch (err) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Conversion failed for ${fileName}:`, {
      error: err.message,
      fileName,
      bucketName,
      processingTime,
      stack: err.stack
    });
    
    // Re-throw to trigger Cloud Function retry if needed
    throw err;
  } finally {
    // 6. Clean up temporary files
    console.log(`🧹 Cleaning up temporary files...`);
    await fs.unlink(localZipPath).catch(err => 
      console.error(`Failed to delete temp zip: ${err.message}`)
    );
    await fs.unlink(tempOutputPath).catch(err => 
      console.error(`Failed to delete temp parquet: ${err.message}`)
    );
    console.log(`🏁 Cleanup complete`);
  }
});

/**
 * Inspects a zip file and finds the first GDB, SHP, or CSV.
 * @param {string} zipPath Path to the local zip file.
 * @returns {Promise<string|null>} The path of the data source within the zip, or null.
 */
function findSourceInZip(zipPath) {
  return new Promise((resolve, reject) => {
    let gdbPath = null;
    let shpPath = null;
    let csvPath = null;

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error(`Failed to open zip file: ${err.message}`);
        return reject(err);
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', (entry) => {
        const entryPath = entry.fileName.toLowerCase();
        const originalPath = entry.fileName;
        
        // Better GDB detection - look for .gdb directory structure
        if (entryPath.includes('.gdb/') && !gdbPath) {
          gdbPath = originalPath.split('.gdb/')[0] + '.gdb';
          console.log(`🗃️  Found GDB: ${gdbPath}`);
        } else if (entryPath.endsWith('.shp') && !shpPath) {
          shpPath = originalPath;
          console.log(`🗺️  Found Shapefile: ${shpPath}`);
        } else if (entryPath.endsWith('.csv') && !csvPath) {
          csvPath = originalPath;
          console.log(`📄 Found CSV: ${csvPath}`);
        }
        
        zipfile.readEntry();
      });
      
      zipfile.on('end', () => {
        const result = gdbPath || shpPath || csvPath;
        console.log(`🔍 Zip inspection complete. Selected: ${result || 'No compatible data found'}`);
        resolve(result);
      });
      
      zipfile.on('error', (err) => {
        console.error(`Error reading zip entries: ${err.message}`);
        reject(err);
      });
    });
  });
}