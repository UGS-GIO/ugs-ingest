import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

import { RouterProvider, createRouter } from '@tanstack/react-router'; // Import router utilities

// Import the generated route tree
import { routeTree } from './routeTree.gen'; // This file will be auto-generated

// Create a router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!;
createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} /> {/* Use RouterProvider */}
  </StrictMode>,
);