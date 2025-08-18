import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from 'google-auth-library';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Google Auth client for service-to-service authentication
const auth = new GoogleAuth();

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

// Proxy endpoint for GDAL microservice with authentication
app.post('/api/gdal-proxy/*', async (req, res) => {
  try {
    const gdalPath = req.params[0] || ''; // Get the path after /api/gdal-proxy/
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
    
    // Get the raw body from the request
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    
    // Prepare headers for the GDAL service
    const headers = {
      'Content-Type': req.headers['content-type'] || 'multipart/form-data',
      'Content-Length': body.length.toString(),
    };
    
    // Add authorization header if we have a token
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    console.log('Request headers being sent:', Object.keys(headers));
    console.log('Has Authorization header:', 'Authorization' in headers);
    console.log('Authorization header starts with:', headers['Authorization'] ? headers['Authorization'].substring(0, 20) : 'none');
    
    // Forward the request to GDAL microservice
    const gdalResponse = await fetch(gdalUrl, {
      method: 'POST',
      headers: headers,
      body: body
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