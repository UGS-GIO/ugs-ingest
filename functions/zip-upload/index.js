const { Storage } = require('@google-cloud/storage');
const functions = require('@google-cloud/functions-framework');

// Initialize GCS client
const storage = new Storage();
const bucketName = 'stagedzips';

/**
 * Cloud Function to upload zip files to GCS
 * HTTP Function that accepts multipart/form-data with zip file and metadata
 */
functions.http('uploadZip', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Authenticated-User-Email');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
    return;
  }

  try {
    console.log('Upload request received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    
    // Get user email from IAP header for logging
    const userEmail = req.headers['x-goog-authenticated-user-email']?.replace('accounts.google.com:', '') || 'unknown';
    console.log('Upload initiated by user:', userEmail);

    // Check if request has file data
    if (!req.body || req.body.length === 0) {
      console.error('No file data received in request body');
      res.status(400).json({ 
        success: false, 
        error: 'No file data received' 
      });
      return;
    }

    // Get filename from query parameters or headers
    const filename = req.query.filename || req.headers['x-filename'];
    if (!filename) {
      console.error('No filename provided');
      res.status(400).json({ 
        success: false, 
        error: 'Filename is required' 
      });
      return;
    }

    console.log('Uploading file:', filename);
    console.log('File size:', req.body.length, 'bytes');

    // Create a reference to the file in GCS
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    // Create upload stream with metadata
    const uploadStream = file.createWriteStream({
      metadata: {
        contentType: 'application/zip',
        metadata: {
          uploadedBy: userEmail,
          uploadedAt: new Date().toISOString(),
          source: 'UGS Ingest Web Application'
        }
      },
      resumable: false // For small files, resumable upload adds overhead
    });

    // Handle upload completion
    uploadStream.on('finish', () => {
      console.log('✅ Upload successful:', filename);
      console.log('File uploaded to gs://' + bucketName + '/' + filename);
      
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        filename: filename,
        bucket: bucketName,
        size: req.body.length,
        uploadedBy: userEmail
      });
    });

    // Handle upload errors
    uploadStream.on('error', (error) => {
      console.error('❌ Upload failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        filename: filename,
        userEmail: userEmail
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Upload failed: ' + error.message,
          filename: filename
        });
      }
    });

    // Write the file data to GCS
    uploadStream.end(req.body);

  } catch (error) {
    console.error('❌ Unexpected error in upload function:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userEmail: req.headers['x-goog-authenticated-user-email']?.replace('accounts.google.com:', '') || 'unknown'
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Internal server error: ' + error.message
      });
    }
  }
});