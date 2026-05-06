import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { LoginPage } from '../../pages/login/ui/LoginPage';
import { RegisterPage } from '../../pages/register/ui/RegisterPage';
import { DashboardPage } from '../../pages/dashboard/ui/DashboardPage';
import { TwoFactorPage } from '../../pages/settings/2fa/ui/TwoFactorPage';
import { AppLayout } from '../../widgets/layout/ui/AppLayout';
import { useAuthStore } from '../../features/auth/model/auth.store';

// Un petit composant pour protéger les routes et appliquer le layout
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.accessToken);
  
  if (!token) {
    return <Navigate to="/login" />;
  }

  return <AppLayout>{children}</AppLayout>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/settings/2fa',
    element: <ProtectedRoute><TwoFactorPage /></ProtectedRoute>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
