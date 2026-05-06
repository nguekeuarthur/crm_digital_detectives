import { AppShell } from '@mantine/core';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      padding="xl"
      style={{ background: '#f8fafc' }}
    >
      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
