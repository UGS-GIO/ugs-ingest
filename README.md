# UGS Ingest

A secure web application for uploading geological datasets to the Utah Geological Survey (UGS) backend systems. Built with React, TypeScript, and deployed on Google Cloud Run with Identity-Aware Proxy (IAP) authentication.

## 🚀 Features

- **🔐 Secure Authentication**: Google Cloud Identity-Aware Proxy (IAP) integration
- **📁 File Upload**: Drag & drop interface with validation
- **👤 User Tracking**: Automatic user identification for audit trails
- **🎨 Modern UI**: Responsive design with Tailwind CSS
- **🧪 Preview Deployments**: Automated preview environments for pull requests
- **⚡ Fast Development**: Vite build system with hot module replacement

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js server for IAP integration
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: TanStack Router
- **Deployment**: Google Cloud Run with Docker containers
- **Authentication**: Google Cloud Identity-Aware Proxy (IAP)
- **CI/CD**: GitHub Actions with Workload Identity Federation

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm
- Google Cloud CLI (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/UGS-GIO/ugs-ingest.git
cd ugs-ingest

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build locally
npm start            # Start Express server (production)
```

### Testing with Simulated IAP

For local development testing with simulated authentication:

```bash
# Create test-iap.js and run:
node test-iap.js

# Visit http://localhost:3001 to test with simulated user
```

## 🚀 Deployment

### Production

The application is automatically deployed to Google Cloud Run when changes are merged to the `main` branch.

**Production URL**: [Configured in Cloud Run with IAP]

### Preview Deployments

Pull requests automatically create preview deployments accessible via tagged URLs:
- Each PR gets a unique revision: `pr-{number}---ugs-ingest-app-{hash}.a.run.app`
- Full IAP authentication required
- Automatic cleanup when PR is closed

## 🔐 Authentication & Authorization

### Identity-Aware Proxy (IAP)

The application uses Google Cloud IAP for authentication:

- **Access Control**: Users must be granted the `IAP-secured Web App User` role
- **Audit Trail**: All access and uploads are logged with user identification
- **Single Sign-On**: Integration with Google Workspace accounts

### User Management

Access is managed through Google Cloud Console:

1. Navigate to **Security** → **Identity-Aware Proxy**
2. Find the `ugs-ingest-app` service
3. Add users/groups with the `IAP-secured Web App User` role

## 📁 File Upload Specifications

### Supported File Types

The upload form accepts various geological data formats:
- Spreadsheets (Excel, CSV)
- Documents (PDF, Word)
- GIS files (Shapefiles, GeoJSON)
- Images and diagrams

### Upload Process

1. **Authentication**: User must be authenticated via IAP
2. **Form Validation**: Required fields and file selection
3. **Audit Logging**: Upload metadata tracked with user information
4. **Backend Processing**: Files prepared for ingestion pipeline

## 🏢 Enterprise Features

- **Persistent Service**: Uses single Cloud Run service for all environments
- **IAP Protection**: All traffic protected by enterprise authentication
- **Audit Trails**: Complete logging of user actions and file uploads
- **Resource Management**: Automatic cleanup of preview deployments

### Security

- **No Public Access**: All routes protected by IAP
- **User Identification**: Express server extracts IAP headers
- **Secure Headers**: Content Security Policy and security headers configured
- **Environment Isolation**: Clear separation between production and preview environments

## 🔧 Configuration

### Environment Variables

- `NODE_ENV`: Environment (production/preview)
- `PR_NUMBER`: Pull request number (for preview deployments)
- `PORT`: Server port (default: 8080)

## 🧪 Testing

### GitHub Actions Workflows

1. **PR Test & Validate**: Validates builds and tests on pull requests
2. **PR Preview Deploy**: Creates tagged preview deployments
3. **Production Deploy**: Deploys to production on main branch merges

### Manual Testing

```bash
# Test local build
npm run build
npm start

# Test Docker build
docker build -t ugs-ingest-test .
docker run -p 8080:8080 ugs-ingest-test
```


## 📋 Project Structure

```
ugs-ingest/
├── .github/workflows/          # GitHub Actions CI/CD
├── public/                     # Static assets
├── server/                     # Express.js backend
│   └── index.js               # IAP integration server
├── src/
│   ├── components/            # React components
│   │   └── UploadForm.tsx    # Main upload form
│   ├── hooks/                # Custom React hooks
│   │   └── useIAPUser.ts     # IAP user integration
│   ├── routes/               # TanStack Router routes
│   └── ...
├── Dockerfile                 # Container configuration
├── package.json              # Dependencies and scripts
└── vite.config.ts            # Vite configuration
```


## 📄 License

Internal use only - Utah Department of Natural Resources, Utah Geological Survey.

---

**Utah Geological Survey**
