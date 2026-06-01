import { useEffect, useState } from 'react';
import {
  Title, Text, Box, Button, Group, Grid, Card, SimpleGrid,
  Badge, Table, ScrollArea, Loader, Center, ThemeIcon,
  Stack, Divider, Progress, Avatar,
} from '@mantine/core';
import {
  IconPlus, IconTrendingUp, IconUsers, IconCash, IconPercentage,
  IconAlertCircle, IconClock, IconChartBar, IconActivity,
  IconUser, IconFileText, IconFolder, IconUpload,
} from '@tabler/icons-react';
import { StatisticsApi, DashboardStats, RevenueByClient } from '../../../shared/api/statistics';
import { MandatApi, Mandat } from '../../../shared/api/mandat';
import { AuditApi, AuditLog } from '../../../shared/api/audit';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Brouillon', color: 'gray' },
  ACTIVE:    { label: 'Actif',     color: 'green' },
  SUSPENDED: { label: 'Suspendu',  color: 'yellow' },
  CLOSED:    { label: 'Clôturé',   color: 'blue' },
};

const ACTION_ICON: Record<string, { icon: typeof IconUser; color: string }> = {
  CREATE:       { icon: IconPlus,      color: '#22C55E' },
  UPDATE:       { icon: IconFileText,  color: '#3B82F6' },
  DELETE:       { icon: IconAlertCircle, color: '#EF4444' },
  UPLOAD_FILE:  { icon: IconUpload,    color: '#AB8E3D' },
  ASSIGN:       { icon: IconUser,      color: '#8B5CF6' },
  DEFAULT:      { icon: IconActivity,  color: '#6B7280' },
};

function getActionIcon(action: string) {
  return ACTION_ICON[action] ?? ACTION_ICON.DEFAULT;
}

function formatCHF(n: number) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mandates, setMandates] = useState<Mandat[]>([]);
  const [topClients, setTopClients] = useState<RevenueByClient[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [urgentCount, setUrgentCount] = useState(0);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      StatisticsApi.getDashboardStats(),
      MandatApi.list({ limit: 6, status: 'ACTIVE' }),
      StatisticsApi.getRevenueByClient(),
      StatisticsApi.getMandatesByStatus(),
      StatisticsApi.getUrgentActions(),
      StatisticsApi.getHoursWorked(),
      AuditApi.getLogs({ limit: 6 }),
    ]).then(([statsRes, mandatesRes, revenueRes, statusRes, urgentRes, hoursRes, auditRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (mandatesRes.status === 'fulfilled') setMandates(mandatesRes.value.mandates ?? []);
      if (revenueRes.status === 'fulfilled') setTopClients(revenueRes.value);
      if (statusRes.status === 'fulfilled') setStatusCounts(statusRes.value);
      if (urgentRes.status === 'fulfilled') setUrgentCount(urgentRes.value.urgentCount ?? 0);
      if (hoursRes.status === 'fulfilled') setHoursWorked(urgentRes.value ? (hoursRes.value as { hoursWorked: number }).hoursWorked : 0);
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.logs ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center style={{ minHeight: '60vh' }}>
        <Loader />
      </Center>
    );
  }

  const totalStatuses = Object.values(statusCounts).reduce((s, v) => s + v, 0) || 1;

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">Vue d&apos;ensemble de votre activité d&apos;investigation</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} color="brand">
          Nouveau mandat
        </Button>
      </Group>

      {/* KPIs principaux */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
          {[
            { label: 'Mandats actifs',   value: stats.activeMandates.value,  change: stats.activeMandates.change,  icon: IconTrendingUp, color: '#AB8E3D' },
            { label: 'Clients totaux',   value: stats.totalClients.value,    change: stats.totalClients.change,    icon: IconUsers,      color: '#3B82F6' },
            { label: 'CA du mois',       value: formatCHF(stats.monthRevenue.value), change: stats.monthRevenue.change, icon: IconCash, color: '#22C55E' },
            { label: 'Taux de réussite', value: `${stats.successRate.value}%`, change: stats.successRate.change,   icon: IconPercentage, color: '#8B5CF6' },
          ].map(({ label, value, change, icon: Icon, color }) => (
            <Card key={label} withBorder padding="md" radius="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text size="sm" c="dimmed">{label}</Text>
                  <Title order={2} mt={4}>{value}</Title>
                  <Text size="xs" c="dimmed" mt={2}>{change}</Text>
                </div>
                <ThemeIcon variant="light" size="lg" radius="md" style={{ color }}>
                  <Icon size={18} />
                </ThemeIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* KPIs secondaires */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        {/* Actions urgentes */}
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">Actions urgentes</Text>
              <Title order={2} mt={4} c={urgentCount > 0 ? 'red' : undefined}>{urgentCount}</Title>
              <Text size="xs" c="dimmed">Mandats sans activité &gt; 3j</Text>
            </div>
            <ThemeIcon variant="light" size="lg" radius="md" color="red">
              <IconAlertCircle size={18} />
            </ThemeIcon>
          </Group>
        </Card>

        {/* Heures travaillées */}
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">Heures ce mois</Text>
              <Title order={2} mt={4}>{hoursWorked}h</Title>
              <Text size="xs" c="dimmed">Temps facturable enregistré</Text>
            </div>
            <ThemeIcon variant="light" size="lg" radius="md" color="blue">
              <IconClock size={18} />
            </ThemeIcon>
          </Group>
        </Card>

        {/* Répartition statuts */}
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Répartition mandats</Text>
            <ThemeIcon variant="light" size="sm" radius="md" color="brand">
              <IconChartBar size={14} />
            </ThemeIcon>
          </Group>
          <Stack gap={6}>
            {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => {
              const count = statusCounts[key] ?? 0;
              return (
                <div key={key}>
                  <Group justify="space-between" mb={2}>
                    <Text size="xs">{label}</Text>
                    <Text size="xs" c="dimmed">{count}</Text>
                  </Group>
                  <Progress value={(count / totalStatuses) * 100} size="xs" color={color} radius="xl" />
                </div>
              );
            })}
          </Stack>
        </Card>
      </SimpleGrid>

      <Grid gutter="md">
        {/* Mandats récents */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md">
              <div>
                <Text fw={600}>Mandats récents</Text>
                <Text size="xs" c="dimmed">Mandats actifs en cours</Text>
              </div>
              <Badge variant="light" color="green">{mandates.length} actifs</Badge>
            </Group>

            <ScrollArea>
              <Table horizontalSpacing="sm" verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mandat</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Enquêteur</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Date</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {mandates.length > 0 ? mandates.map(m => (
                    <Table.Tr key={m.id}>
                      <Table.Td>
                        <Text size="sm" fw={500} truncate maw={180}>{m.title}</Text>
                        <Text size="xs" c="dimmed" ff="monospace">{m.id.substring(0, 8)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {m.client ? `${m.client.firstName} ${m.client.lastName}` : '—'}
                        </Text>
                        {m.client?.company && <Text size="xs" c="dimmed">{m.client.company}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {m.enqueteur ? `${m.enqueteur.firstName} ${m.enqueteur.lastName}` : <Text c="dimmed" size="sm">Non assigné</Text>}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_CONFIG[m.status]?.color ?? 'gray'} variant="light" size="sm">
                          {STATUS_CONFIG[m.status]?.label ?? m.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{new Date(m.createdAt).toLocaleDateString('fr-CH')}</Text>
                      </Table.Td>
                    </Table.Tr>
                  )) : (
                    <Table.Tr>
                      <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                        <Text c="dimmed" size="sm" py="md">Aucun mandat actif</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>

        {/* Panel droit */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {/* Top clients */}
            <Card withBorder padding="md" radius="md">
              <Text fw={600} mb="md">Top clients — CA estimé</Text>
              <Stack gap={0}>
                {topClients.length > 0 ? topClients.slice(0, 5).map((c, i) => (
                  <div key={c.id}>
                    {i > 0 && <Divider my="xs" />}
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Avatar size="sm" radius="xl" color="brand">
                          {c.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <div>
                          <Text size="sm" fw={500} truncate maw={120}>{c.name}</Text>
                          <Text size="xs" c="dimmed">{c.mandateCount} mandat{c.mandateCount > 1 ? 's' : ''}</Text>
                        </div>
                      </Group>
                      <Text size="sm" fw={600} c="green">{formatCHF(c.estimatedRevenue)}</Text>
                    </Group>
                  </div>
                )) : (
                  <Text size="sm" c="dimmed" ta="center">Aucune donnée</Text>
                )}
              </Stack>
            </Card>

            {/* Activité récente (audit) */}
            <Card withBorder padding="md" radius="md">
              <Text fw={600} mb="md">Activité récente</Text>
              <Stack gap={0}>
                {auditLogs.length > 0 ? auditLogs.slice(0, 5).map((log, i) => {
                  const { icon: Icon, color } = getActionIcon(log.action);
                  return (
                    <div key={log.id}>
                      {i > 0 && <Divider my="xs" />}
                      <Group gap="sm" align="flex-start">
                        <ThemeIcon size="sm" variant="light" radius="xl" style={{ color, flexShrink: 0, marginTop: 2 }}>
                          <Icon size={12} />
                        </ThemeIcon>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="xs" fw={500}>
                            {log.action} <Text span c="dimmed">{log.entity}</Text>
                          </Text>
                          {log.user && (
                            <Text size="xs" c="dimmed">{log.user.firstName} {log.user.lastName}</Text>
                          )}
                        </div>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>{timeAgo(log.createdAt)}</Text>
                      </Group>
                    </div>
                  );
                }) : (
                  <Text size="sm" c="dimmed" ta="center">Aucune activité</Text>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      {/* Modules intégrés — info */}
      <Card withBorder padding="sm" radius="md" mt="md">
        <Group gap="lg" wrap="wrap">
          {[
            { icon: IconFolder,   label: 'Dossiers & preuves', sub: 'Upload + EXIF + géolocalisation' },
            { icon: IconUpload,   label: 'Nikon Cloud',         sub: 'Import automatique' },
            { icon: IconCash,     label: 'Catalogue',           sub: 'Prestations + devis' },
            { icon: IconActivity, label: 'Audit log',           sub: 'Toutes les actions tracées' },
            { icon: IconUsers,    label: 'Sous-traitants',      sub: 'Accès temporaires' },
          ].map(({ icon: Icon, label, sub }) => (
            <Group key={label} gap="xs">
              <ThemeIcon size="sm" variant="light" color="brand" radius="md">
                <Icon size={12} />
              </ThemeIcon>
              <div>
                <Text size="xs" fw={500}>{label}</Text>
                <Text size="xs" c="dimmed">{sub}</Text>
              </div>
            </Group>
          ))}
        </Group>
      </Card>
    </Box>
  );
}
