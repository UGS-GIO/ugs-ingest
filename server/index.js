import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Increase payload limit for file uploads through proxy
app.use(express.raw({ 
  type: 'multipart/form-data', 
  limit: '100mb' 
}));

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

// Proxy endpoint for GDAL microservice
app.post('/api/gdal-proxy/*', async (req, res) => {
  try {
    const gdalPath = req.params[0] || ''; // Get the path after /api/gdal-proxy/
    
    // Use internal URL when running on Cloud Run
    const isCloudRun = process.env.K_SERVICE !== undefined;
    const gdalUrl = isCloudRun 
      ? `https://gdal-microservice-534590904912.us-central1.run.app/${gdalPath}`
      : `https://gdal-microservice-534590904912.us-central1.run.app/${gdalPath}`;
    
    console.log(`Proxying GDAL request to: ${gdalUrl}`);
    
    // Get the raw body from the request
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    
    // Forward the request to GDAL microservice
    // When running on Cloud Run, the service account auth is automatic
    const gdalResponse = await fetch(gdalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'multipart/form-data',
        'Content-Length': body.length.toString(),
      },
      body: body
    });
    
    if (!gdalResponse.ok) {
      const errorText = await gdalResponse.text();
      console.error('GDAL service error:', gdalResponse.status, errorText);
      return res.status(gdalResponse.status).json({ 
        error: 'GDAL service error', 
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
});