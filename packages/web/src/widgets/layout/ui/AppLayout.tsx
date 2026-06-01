import { AppShell, Group, Text, ThemeIcon, NavLink, Box } from '@mantine/core';
import { Link, useLocation , useNavigate } from 'react-router-dom';
import { IconDashboard, IconUsers, IconCalendar, IconUserCheck, IconLogout, IconPhone, IconFolders, IconChartBar, IconFileInvoice, IconMap, IconBriefcase } from '@tabler/icons-react';
import { useAuthStore } from '../../../features/auth/model/auth.store';


const navigationItems = [
  { label: 'Dashboard', icon: IconDashboard, href: '/' },
  { label: 'Clients & Mandats', icon: IconUsers, href: '/clients' },
  { label: 'Mandats', icon: IconBriefcase, href: '/mandats' },
  { label: 'Devis', icon: IconFileInvoice, href: '/devis' },
  { label: 'Planning', icon: IconCalendar, href: '/planning' },
  { label: 'Sous-traitants', icon: IconUserCheck, href: '/subcontractors' },
  { label: 'Communications', icon: IconPhone, href: '/communications' },
  { label: 'Dossiers', icon: IconFolders, href: '/dossiers' },
  { label: 'Visionneuse EXIF', icon: IconMap, href: '/visionneuse' },
  { label: 'Rapports', icon: IconChartBar, href: '/rapports' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      layout="alt"
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      padding="xl"
      style={{ background: '#f8fafc' }}
    >
      <AppShell.Navbar p="md" style={{ background: '#1a1a1a' }}>
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <Group justify="center" mb="xl">
            <ThemeIcon
              size="lg"
              radius="md"
              variant="filled"
              color="brand"
            >
              <Text c="white" fw={700} size="lg">DD</Text>
            </ThemeIcon>
            <Text c="white" fw={700}>Digital Detectives</Text>
          </Group>

          {/* Navigation Links */}
          <Box style={{ flex: 1 }}>
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.href}
                  label={item.label}
                  leftSection={<item.icon size={16} />}
                  component={Link}
                  to={item.href}
                  active={isActive}
                  style={{
                    color: isActive ? '#fff' : '#999',
                    backgroundColor: isActive ? 'rgba(13, 110, 253, 0.1)' : 'transparent',
                    marginBottom: '8px',
                    borderRadius: '8px',
                  }}
                />
              );
            })}
          </Box>

          {/* Logout Button */}
          <NavLink
            label="Déconnexion"
            leftSection={<IconLogout size={16} />}
            onClick={handleLogout}
            style={{
              color: '#999',
              marginTop: 'auto',
            }}
          />
        </Box>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
