import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Box, Center, Image } from '@mantine/core';
import { LoginPage } from '../../pages/login/ui/LoginPage';
import { RegisterPage } from '../../pages/register/ui/RegisterPage';
import { DashboardPage } from '../../pages/dashboard/ui/DashboardPage';
import { TwoFactorPage } from '../../pages/settings/2fa/ui/TwoFactorPage';
import { AppLayout } from '../../widgets/layout/ui/AppLayout';
import { useAuthStore } from '../../features/auth/model/auth.store';

// Protège les routes et restaure la session si un refreshToken existe
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.accessToken);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      restoreSession().finally(() => setSessionChecked(true));
    } else {
      setSessionChecked(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sessionChecked || isRestoringSession) {
    // Écran de chargement pendant la restauration de session
    return (
      <Center style={{ minHeight: '100vh', background: '#0a0900' }}>
        <Box style={{ opacity: 0.7 }}>
          <Image src="/logo-dore.png" alt="Digital Detectives" h={60} fit="contain" />
        </Box>
      </Center>
    );
  }

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
