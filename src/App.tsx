import React from 'react';
import { UploadForm } from './components/UploadForm';

function App() {
  return (
    <div className="app-container"> {/* Add a class for potential specific container styling */}
      <h1 className="app-title">
        UGS Data Ingestion Portal
      </h1>
      <UploadForm />
    </div>
  );
}

export default App;