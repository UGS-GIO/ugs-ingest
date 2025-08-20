const { Storage } = require('@google-cloud/storage');
const functions = require('@google-cloud/functions-framework');

// Initialize GCS client
const storage = new Storage();
const bucketName = 'stagedzips';

/**
 * Cloud Function to generate signed URLs for direct GCS upload
 * This bypasses the 10MB Cloud Function limit by allowing direct upload to GCS
 */
functions.http('ugs-zip-upload', async (req, res) => {
  // Set CORS headers FIRST - this fixes CORS issues
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Goog-Authenticated-User-Email, X-Filename, X-File-Size');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow POST and GET requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    console.error('Method not allowed:', req.method);
    res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST or GET.' 
    });
    return;
  }

  try {
    console.log('Signed URL request received');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query params:', req.query);
    console.log('Body:', req.body);
    
    // Get user email from IAP header for logging
    const userEmail = req.headers['x-goog-authenticated-user-email']?.replace('accounts.google.com:', '') || 'unknown';
    console.log('Request from user:', userEmail);

    // Get filename and file size from query parameters or headers
    const filename = req.query.filename || req.headers['x-filename'] || req.body?.filename;
    const fileSize = req.query.fileSize || req.headers['x-file-size'] || req.body?.fileSize;

    if (!filename) {
      console.error('No filename provided');
      res.status(400).json({ 
        success: false, 
        error: 'Filename is required. Provide via query param, header, or body.' 
      });
      return;
    }

    console.log(`🔐 Generating signed URL for file: ${filename}`);
    console.log(`📦 Expected file size: ${fileSize} bytes (${fileSize ? (fileSize / 1024 / 1024).toFixed(2) + 'MB' : 'unknown'})`);

    // Create a reference to the file in GCS
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    // Generate signed URL for upload (valid for 2 hours to handle large files)
    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
      contentType: 'application/zip',
      
      // Add custom metadata that will be stored with the file
      extensionHeaders: {
        'x-goog-meta-uploaded-by': userEmail,
        'x-goog-meta-uploaded-at': new Date().toISOString(),
        'x-goog-meta-source': 'UGS-Ingest-Web-Application',
        'x-goog-meta-file-size': fileSize || 'unknown',
        'x-goog-meta-original-filename': '', // Will be set by frontend
        'x-goog-meta-file-size-bytes': '', // Will be set by frontend
        'x-goog-meta-file-size-mb': '' // Will be set by frontend
      }
    };

    console.log('Requesting signed URL with options:', {
      ...options,
      expires: new Date(options.expires).toISOString()
    });

    const [signedUrl] = await file.getSignedUrl(options);

    console.log('✅ Signed URL generated successfully');
    console.log('Signed URL length:', signedUrl.length);
    console.log('Expires at:', new Date(options.expires).toISOString());

    // Return the signed URL and metadata
    res.status(200).json({
      success: true,
      signedUrl: signedUrl,
      filename: filename,
      bucket: bucketName,
      uploadedBy: userEmail,
      expiresAt: new Date(options.expires).toISOString(),
      expiresIn: '2 hours',
      fileSize: fileSize,
      instructions: {
        method: 'PUT',
        contentType: 'application/zip',
        note: 'Use PUT method to upload directly to the signed URL'
      }
    });

  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      userEmail: req.headers['x-goog-authenticated-user-email']?.replace('accounts.google.com:', '') || 'unknown'
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate signed URL: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});