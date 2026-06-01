import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import React, { useEffect, useState, Suspense } from 'react';
import { Box, Center, Image, Loader } from '@mantine/core';
import { AppLayout } from '../../widgets/layout/ui/AppLayout';
import { useAuthStore } from '../../features/auth/model/auth.store';

// Lazy loading des pages pour réduire la taille initiale du bundle
const LoginPage = React.lazy(() => import('../../pages/login/ui/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('../../pages/register/ui/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = React.lazy(() => import('../../pages/dashboard/ui/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ClientsPage = React.lazy(() => import('../../pages/clients/ui/ClientsPage').then(m => ({ default: m.ClientsPage })));
const PlanningPage = React.lazy(() => import('../../pages/planning/ui/PlanningPage').then(m => ({ default: m.PlanningPage })));
const SubcontractorsPage = React.lazy(() => import('../../pages/subcontractors/ui/SubcontractorsPage').then(m => ({ default: m.SubcontractorsPage })));
const TwoFactorPage = React.lazy(() => import('../../pages/settings/2fa/ui/TwoFactorPage').then(m => ({ default: m.TwoFactorPage })));
const EmailSettingsPage = React.lazy(() => import('../../pages/settings/emails/ui/EmailSettingsPage').then(m => ({ default: m.EmailSettingsPage })));
const ContractSettingsPage = React.lazy(() => import('../../pages/settings/contracts/ui/ContractSettingsPage').then(m => ({ default: m.ContractSettingsPage })));
const StripeSettingsPage = React.lazy(() => import('../../pages/settings/stripe/ui/StripeSettingsPage').then(m => ({ default: m.StripeSettingsPage })));
const NotFoundPage = React.lazy(() => import('../../pages/error/ui/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Composant de chargement global pour Suspense
const GlobalLoader = () => (
  <Center style={{ minHeight: '100vh', background: '#0a0900' }}>
    <Box style={{ opacity: 0.7, textAlign: 'center' }}>
      <Image src="/logo-dore.png" alt="Digital Detectives" h={60} fit="contain" mb={20} />
      <Loader color="yellow" type="dots" />
    </Box>
  </Center>
);

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
    return <GlobalLoader />;
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
    path: '/clients',
    element: <ProtectedRoute><ClientsPage /></ProtectedRoute>,
  },
  {
    path: '/planning',
    element: <ProtectedRoute><PlanningPage /></ProtectedRoute>,
  },
  {
    path: '/subcontractors',
    element: <ProtectedRoute><SubcontractorsPage /></ProtectedRoute>,
  },
  {
    path: '/settings/2fa',
    element: <ProtectedRoute><TwoFactorPage /></ProtectedRoute>,
  },
  {
    path: '/settings/emails',
    element: <ProtectedRoute><EmailSettingsPage /></ProtectedRoute>,
  },
  {
    path: '/settings/contracts',
    element: <ProtectedRoute><ContractSettingsPage /></ProtectedRoute>,
  },
  {
    path: '/settings/stripe',
    element: <ProtectedRoute><StripeSettingsPage /></ProtectedRoute>,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  }
]);

export function AppRouter() {
  return (
    <Suspense fallback={<GlobalLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
