import os
import zipfile
from pathlib import Path
from google.cloud import storage
from osgeo import gdal

# Initialize Cloud Storage client
storage_client = storage.Client()

# --- Configuration ---
# Set this as an environment variable in your Cloud Function
OUTPUT_BUCKET_NAME = os.environ.get('OUTPUT_BUCKET')

def convert_to_geoparquet(event, context):
    """
    Cloud Function triggered by a file upload to a GCS bucket.
    Inspects a zip file, finds geospatial data (GDB, Shapefile),
    and converts it to GeoParquet format.
    """
    # Get information about the uploaded file from the trigger event
    bucket_name = event['bucket']
    file_name = event['name']
    
    # Ensure we only process zip files
    if not file_name.lower().endswith('.zip'):
        print(f"File {file_name} is not a zip file. Skipping.")
        return

    print(f"Processing file: {file_name} from bucket: {bucket_name}.")

    # Define file paths for GDAL's virtual file system
    # This lets GDAL read directly from the zip file in GCS
    gcs_zip_path = f"/vsizip//vsigs/{bucket_name}/{file_name}"

    # --- 1. Inspect the zip file to find the source data ---
    source_data_path = None
    try:
        # To inspect contents, we need a local copy of the zip file
        # Download the zip to the function's temporary directory
        source_bucket = storage_client.bucket(bucket_name)
        source_blob = source_bucket.blob(file_name)
        local_zip_path = f"/tmp/{file_name}"
        source_blob.download_to_filename(local_zip_path)

        # Inspect the local zip file
        with zipfile.ZipFile(local_zip_path, 'r') as zf:
            file_list = zf.namelist()
            
            # Prioritize finding a Geodatabase (.gdb)
            gdb_path = next((f for f in file_list if f.lower().endswith('.gdb/')), None)
            if gdb_path:
                source_data_path = f"{gcs_zip_path}/{Path(gdb_path).parent}"
                print(f"Found Geodatabase: {source_data_path}")

            # If no GDB, look for a Shapefile (.shp)
            elif not source_data_path:
                shp_path = next((f for f in file_list if f.lower().endswith('.shp')), None)
                if shp_path:
                    source_data_path = f"{gcs_zip_path}/{shp_path}"
                    print(f"Found Shapefile: {source_data_path}")
            
            # If no GDB or SHP, look for a CSV file (.csv)
            elif not source_data_path:
                csv_path = next((f for f in file_list if f.lower().endswith('.csv')), None)
                if csv_path:
                    source_data_path = f"{gcs_zip_path}/{csv_path}"
                    print(f"Found CSV: {source_data_path}")

    except Exception as e:
        print(f"Error inspecting zip file {file_name}: {e}")
        return

    finally:
        # Clean up the downloaded zip file
        if os.path.exists(local_zip_path):
            os.remove(local_zip_path)

    if not source_data_path:
        print(f"No convertible data source (GDB, Shapefile, CSV) found in {file_name}.")
        return

    # --- 2. Convert the data to GeoParquet ---
    output_filename_stem = Path(file_name).stem
    temp_output_path = f"/tmp/{output_filename_stem}.parquet"
    
    print(f"Converting {source_data_path} to {temp_output_path}...")

    # Set options for gdal.VectorTranslate, equivalent to your ogr2ogr command
    # This is more robust than running a subprocess
    options = gdal.VectorTranslateOptions(
        format='Parquet',
        layerCreationOptions=[
            'COMPRESSION=SNAPPY',
            'EDGES=PLANAR',
            'GEOMETRY_ENCODING=WKB',
            'GEOMETRY_NAME=geometry',
            'ROW_GROUP_SIZE=65536'
        ],
        accessMode='overwrite',
        makeValid=True,
        # Configuration options equivalent to --config
        gdal_config_options={'OGR_PARQUET_ALLOW_ALL_DIMS': 'YES'}
    )

    try:
        # This is the Python equivalent of running ogr2ogr
        gdal.VectorTranslate(temp_output_path, source_data_path, options=options)
        print("Conversion successful.")
    except Exception as e:
        print(f"Error during GDAL conversion: {e}")
        return

    # --- 3. Upload the resulting Parquet file to the output bucket ---
    if not os.path.exists(temp_output_path):
        print("Conversion failed, output file not created.")
        return

    output_bucket = storage_client.bucket(OUTPUT_BUCKET_NAME)
    output_blob_name = f"{output_filename_stem}.parquet"
    output_blob = output_bucket.blob(output_blob_name)
    
    print(f"Uploading {output_blob_name} to bucket {OUTPUT_BUCKET_NAME}...")
    output_blob.upload_from_filename(temp_output_path)
    print("Upload complete.")

    # Clean up the temporary parquet file
    os.remove(temp_output_path)