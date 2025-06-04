import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet /> {/* This is where child routes will render */}
    </>
  ),
});