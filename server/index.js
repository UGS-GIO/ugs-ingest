import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Google Auth client for service-to-service authentication
const auth = new GoogleAuth();

// Initialize Cloud Storage client for cleanup operations
const gcsStorage = new Storage();

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// API endpoint to get IAP user information
app.get('/api/user', (req, res) => {
  // IAP adds these headers automatically
  const email = req.headers['x-goog-authenticated-user-email'];
  const id = req.headers['x-goog-authenticated-user-id'];

  if (!email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Remove the accounts.google.com: prefix if present
  const cleanEmail = email.replace('accounts.google.com:', '');
  
  res.json({ 
    email: cleanEmail, 
    id: id ? id.replace('accounts.google.com:', '') : null,
    authenticated: true 
  });
});

// Enhanced GDAL proxy endpoint with size checking and better error handling
app.post('/api/gdal-proxy/*', async (req, res) => {
  try {
    const gdalPath = req.params[0] || '';
    const gdalUrl = `https://gdal-microservice-534590904912.us-central1.run.app/${gdalPath}`;
    
    console.log(`Proxying GDAL request to: ${gdalUrl}`);
    
    // Get an ID token for service-to-service authentication
    let idToken = '';
    try {
      const client = await auth.getIdTokenClient(gdalUrl);
      const token = await client.idTokenProvider.fetchIdToken(gdalUrl);
      idToken = token;
      console.log('Successfully obtained ID token for GDAL service');
      console.log('Token length:', idToken.length);
    } catch (authError) {
      console.error('Failed to get ID token:', authError);
      // If we can't get a token, try anyway (might work if service allows unauthenticated)
    }
    
    // Collect the request body while preserving multipart data and checking size
    const chunks = [];
    let totalSize = 0;
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit for direct uploads
    
    for await (const chunk of req) {
      totalSize += chunk.length;
      
      // Check size limit early to avoid processing huge files
      if (totalSize > MAX_SIZE) {
        console.error(`❌ Request too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_SIZE / 1024 / 1024}MB limit`);
        return res.status(413).json({
          success: false,
          error: 'File too large for direct analysis',
          details: `File size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds the ${MAX_SIZE / 1024 / 1024}MB limit. The system will automatically use Cloud Storage staging for large files.`,
          suggestedAction: 'The frontend should retry with Cloud Storage staging method',
          maxSizeMB: MAX_SIZE / 1024 / 1024,
          actualSizeMB: totalSize / 1024 / 1024
        });
      }
      
      chunks.push(chunk);
    }
    
    const body = Buffer.concat(chunks);
    
    console.log(`📦 Request body size: ${(body.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Prepare headers for the GDAL service - preserve original headers
    const headers = {
      'Content-Type': req.headers['content-type'], // Keep exact content-type with boundary
      'Content-Length': body.length.toString(),
    };
    
    // Add authorization header if we have a token
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    console.log('Request headers being sent:', Object.keys(headers));
    console.log('Has Authorization header:', 'Authorization' in headers);
    console.log('Authorization header starts with:', headers['Authorization'] ? headers['Authorization'].substring(0, 20) : 'none');
    console.log('Content-Type:', headers['Content-Type']);
    console.log('Body size:', body.length, 'bytes');
    
    // Forward the request to GDAL microservice
    const gdalResponse = await fetch(gdalUrl, {
      method: 'POST',
      headers: headers,
      body: body // Use the collected buffer
    });
    
    console.log('GDAL response status:', gdalResponse.status);
    console.log('GDAL response headers:', Object.fromEntries(gdalResponse.headers));
    
    if (!gdalResponse.ok) {
      const errorText = await gdalResponse.text();
      console.error('GDAL service error details:');
      console.error(errorText);
      return res.status(gdalResponse.status).json({ 
        error: 'GDAL service error', 
        status: gdalResponse.status,
        details: errorText 
      });
    }
    
    const result = await gdalResponse.json();
    res.json(result);
    
  } catch (error) {
    console.error('GDAL proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to process GDAL request',
      details: error.message 
    });
  }
});

// New endpoint: Analyze geodatabase from Cloud Storage (for large files)
app.post('/api/gdal-proxy/analyze-from-storage', async (req, res) => {
  try {
    const { bucket, filename, gdbFolderName, command, args } = req.body;
    
    console.log(`🔍 GDAL analysis request from Cloud Storage:`);
    console.log(`  Bucket: ${bucket}`);
    console.log(`  File: ${filename}`);
    console.log(`  GDB Folder: ${gdbFolderName}`);
    console.log(`  Command: ${command}`);
    console.log(`  Args: ${JSON.stringify(args)}`);
    
    // Construct the Cloud Storage path for GDAL
    const gcsPath = `/vsizip/gs://${bucket}/${filename}/${gdbFolderName}`;
    console.log(`  GCS Path: ${gcsPath}`);
    
    // Get an ID token for service-to-service authentication
    let idToken = '';
    try {
      const gdalBaseUrl = `https://gdal-microservice-534590904912.us-central1.run.app/`;
      const client = await auth.getIdTokenClient(gdalBaseUrl);
      const token = await client.idTokenProvider.fetchIdToken(gdalBaseUrl);
      idToken = token;
      console.log('✅ Successfully obtained ID token for GDAL service');
    } catch (authError) {
      console.error('⚠️ Failed to get ID token:', authError);
    }
    
    // Prepare the request to GDAL microservice
    const gdalRequest = {
      command: command,
      args: args.map(arg => arg.replace(`/vsizip/${filename}/${gdbFolderName}`, gcsPath))
    };
    
    console.log(`📤 Sending request to GDAL microservice:`, gdalRequest);
    
    // Make request to GDAL microservice
    const gdalUrl = 'https://gdal-microservice-534590904912.us-central1.run.app/execute';
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    const gdalResponse = await fetch(gdalUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(gdalRequest)
    });
    
    console.log('GDAL response status:', gdalResponse.status);
    
    if (!gdalResponse.ok) {
      const errorText = await gdalResponse.text();
      console.error('GDAL service error:', errorText);
      return res.status(gdalResponse.status).json({ 
        success: false,
        error: 'GDAL service error', 
        status: gdalResponse.status,
        details: errorText 
      });
    }
    
    const result = await gdalResponse.json();
    console.log('✅ GDAL analysis completed successfully');
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in GDAL Cloud Storage analysis:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze geodatabase from Cloud Storage',
      details: error.message 
    });
  }
});

// New endpoint: Clean up temporary analysis files
app.post('/api/gdal-proxy/cleanup-temp-file', async (req, res) => {
  try {
    const { bucket, filename } = req.body;
    
    console.log(`🧹 Cleaning up temporary file: gs://${bucket}/${filename}`);
    
    // Delete the temporary file from Cloud Storage
    const file = gcsStorage.bucket(bucket).file(filename);
    
    try {
      await file.delete();
      console.log(`✅ Successfully deleted temporary file: ${filename}`);
      res.json({ success: true, message: 'Temporary file cleaned up' });
    } catch (deleteError) {
      if (deleteError.code === 404) {
        console.log(`ℹ️ Temporary file already deleted or doesn't exist: ${filename}`);
        res.json({ success: true, message: 'File already cleaned up' });
      } else {
        throw deleteError;
      }
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up temporary file:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cleanup temporary file',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Handle client-side routing - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Running on Cloud Run: ${process.env.K_SERVICE !== undefined}`);
  console.log(`Service Account: ${process.env.K_SERVICE ? 'Will use metadata service' : 'Local development'}`);
});