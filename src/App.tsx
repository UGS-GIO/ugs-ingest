import React from 'react';
import { Outlet } from '@tanstack/react-router'; // Import Outlet

function App() {
  return (
    <div className="app-container">
      <h1 className="app-title">
        UGS Data Ingestion Portal
      </h1>
      {/* Outlet renders the currently matched route's component */}
      <Outlet />
    </div>
  );
}

export default App;