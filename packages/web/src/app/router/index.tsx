import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <div>CRM Dashboard (FSD setup complete)</div>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
