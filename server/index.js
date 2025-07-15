import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

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
});