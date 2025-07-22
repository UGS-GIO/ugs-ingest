const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const gdal = require('gdal-async');
const yauzl = require('yauzl');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Initialize clients
const storage = new Storage();
const outputBucketName = process.env.OUTPUT_BUCKET;

// Register the CloudEvent function
functions.cloudEvent('convertToGeoparquetNode', async (cloudEvent) => {
  const file = cloudEvent.data;
  const bucketName = file.bucket;
  const fileName = file.name;

  console.log(`Event ID: ${cloudEvent.id}`);
  console.log(`Event Type: ${cloudEvent.type}`);

  if (!fileName.toLowerCase().endsWith('.zip')) {
    console.log(`File ${fileName} is not a zip file. Skipping.`);
    return;
  }
  console.log(`Processing file: ${fileName} from bucket: ${bucketName}.`);

  const tempDir = os.tmpdir();
  const localZipPath = path.join(tempDir, fileName);
  const outputFileName = `${path.basename(fileName, '.zip')}.parquet`;
  const tempOutputPath = path.join(tempDir, outputFileName);

  try {
    // 1. Download the zip file to a temporary location
    await storage.bucket(bucketName).file(fileName).download({ destination: localZipPath });

    // 2. Inspect the zip file to find the source data
    const sourceDataPathInZip = await findSourceInZip(localZipPath);
    if (!sourceDataPathInZip) {
      console.log(`No convertible data source (GDB, Shapefile, CSV) found in ${fileName}.`);
      return;
    }
    
    // Construct the full virtual path for GDAL
    const gdalInputPath = `/vsizip/${localZipPath}/${sourceDataPathInZip}`;
    console.log(`Found source data: ${gdalInputPath}`);
    
    // 3. Open the source dataset and convert to GeoParquet
    console.log(`Converting ${gdalInputPath} to ${tempOutputPath}...`);
    const inputDataset = await gdal.openAsync(gdalInputPath);
    
    // These options are equivalent to the ogr2ogr command flags
    const translateOptions = [
      '-f', 'Parquet',
      '--config', 'OGR_PARQUET_ALLOW_ALL_DIMS', 'YES',
      '-makevalid',
      '-lco', 'COMPRESSION=SNAPPY',
      '-lco', 'EDGES=PLANAR',
      '-lco', 'GEOMETRY_ENCODING=WKB',
      '-lco', 'GEOMETRY_NAME=geometry',
      '-lco', 'ROW_GROUP_SIZE=65536'
    ];

    await gdal.vectorTranslateAsync(tempOutputPath, inputDataset, translateOptions);
    console.log('Conversion successful.');

    // 4. Upload the resulting Parquet file to the output bucket
    console.log(`Uploading ${outputFileName} to bucket ${outputBucketName}...`);
    await storage.bucket(outputBucketName).upload(tempOutputPath, {
      destination: outputFileName,
    });
    console.log('Upload complete.');

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    // 5. Clean up temporary files
    await fs.unlink(localZipPath).catch(err => console.error(`Failed to delete temp zip: ${err.message}`));
    await fs.unlink(tempOutputPath).catch(err => console.error(`Failed to delete temp parquet: ${err.message}`));
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
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const entryPath = entry.fileName;
        if (entryPath.toLowerCase().endsWith('.gdb/')) {
            gdbPath = path.dirname(entryPath);
        } else if (entryPath.toLowerCase().endsWith('.shp')) {
            shpPath = entryPath;
        } else if (entryPath.toLowerCase().endsWith('.csv')) {
            csvPath = entryPath;
        }
        zipfile.readEntry();
      });
      zipfile.on('end', () => {
        // Return the source with the highest priority
        resolve(gdbPath || shpPath || csvPath);
      });
      zipfile.on('error', (err) => reject(err));
    });
  });
}