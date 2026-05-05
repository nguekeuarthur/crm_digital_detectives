import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage } from '../../pages/login/ui/LoginPage';
import { TwoFactorPage } from '../../pages/settings/2fa/ui/TwoFactorPage';
import { useAuthStore } from '../../features/auth/model/auth.store';

// Un petit composant pour protéger les routes
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.accessToken);
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <PrivateRoute><div>CRM Dashboard (FSD setup complete)</div></PrivateRoute>,
  },
  {
    path: '/settings/2fa',
    element: <PrivateRoute><TwoFactorPage /></PrivateRoute>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
