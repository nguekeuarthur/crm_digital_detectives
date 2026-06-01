import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Title, Text, Box, Button, Group, Card, Table, ScrollArea,
  Loader, Center, Badge, TextInput, Select, SimpleGrid,
  ThemeIcon, Pagination, Tooltip, ActionIcon, Collapse,
  Checkbox,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconSearch, IconPlus, IconUsers, IconBriefcase, IconCoin,
  IconDownload, IconFilter, IconChevronUp, IconChevronDown,
  IconAlertTriangle, IconSelector,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { ClientApi, Client } from '../../../shared/api/client';
import { StatisticsApi } from '../../../shared/api/statistics';
import { formatCurrency } from '../../../shared/constants';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { ClientFormModal } from './ClientFormModal';

// Decode JWT payload to get role without a /me endpoint
function getRole(token: string | null): string {
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1])).role ?? '';
  } catch {
    return '';
  }
}

type SortField = 'firstName' | 'lastName' | 'email' | 'createdAt' | 'status';

const STATUS_COLOR: Record<string, string> = {
  ACTIF: 'green',
  PROSPECT: 'blue',
  INACTIF: 'gray',
};

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== field) return <IconSelector size={14} opacity={0.3} />;
  return sortOrder === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
}

export function ClientsPage() {
  const navigate = useNavigate();
  const token = useAuthStore(s => s.accessToken);
  const isAdmin = getRole(token) === 'ADMIN';

  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({ total: 0, revenue: 0, mandateCount: 0 });
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);

  // Search avec debounce
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filtres
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [hasActiveMandats, setHasActiveMandats] = useState(false);

  // Tri
  const [sortBy, setSortBy] = useState<SortField>('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const handleSort = (field: SortField) => {
    if (field === sortBy) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, revenueData] = await Promise.all([
        ClientApi.list({
          search: search || undefined,
          status: filterStatus || undefined,
          source: (filterSource as 'WP' | 'CRM') || undefined,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          hasActiveMandats: hasActiveMandats || undefined,
          sortBy,
          sortOrder,
          page,
          limit: LIMIT,
        }),
        StatisticsApi.getRevenueByClient(),
      ]);

      setClients(clientsData.clients ?? []);
      setTotal(clientsData.total ?? 0);
      setTotalPages(clientsData.totalPages ?? 1);

      const totalRevenue = revenueData.reduce((s, c) => s + c.estimatedRevenue, 0);
      const totalMandates = revenueData.reduce((s, c) => s + c.mandateCount, 0);
      setStats({ total: clientsData.total ?? 0, revenue: totalRevenue, mandateCount: totalMandates });
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterSource, filterStartDate, filterEndDate, hasActiveMandats, sortBy, sortOrder, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1); }, [search, filterStatus, filterSource, filterStartDate, filterEndDate, hasActiveMandats, sortBy, sortOrder]);

  // Détection des doublons sur la page courante
  const duplicateIds = useMemo(() => {
    const emails = new Map<string, number>();
    const phones = new Map<string, number>();
    clients.forEach(c => {
      const e = c.email.toLowerCase();
      emails.set(e, (emails.get(e) ?? 0) + 1);
      if (c.phone) {
        const p = c.phone.replace(/[\s\-.()]/g, '');
        phones.set(p, (phones.get(p) ?? 0) + 1);
      }
    });
    const ids = new Set<string>();
    clients.forEach(c => {
      if ((emails.get(c.email.toLowerCase()) ?? 0) > 1) ids.add(c.id);
      if (c.phone && (phones.get(c.phone.replace(/[\s\-.()]/g, '')) ?? 0) > 1) ids.add(c.id);
    });
    return ids;
  }, [clients]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await ClientApi.exportCsv({
        search: search || undefined,
        status: filterStatus || undefined,
        source: (filterSource as 'WP' | 'CRM') || undefined,
        hasActiveMandats: hasActiveMandats || undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = !!(filterStatus || filterSource || filterStartDate || filterEndDate || hasActiveMandats);
  const activeFilterCount = [filterStatus, filterSource, filterStartDate, filterEndDate, hasActiveMandats ? 'x' : ''].filter(Boolean).length;

  if (loading && clients.length === 0) {
    return <Center style={{ minHeight: '60vh' }}><Loader /></Center>;
  }

  return (
    <Box p="md">
      <ClientFormModal opened={formOpened} onClose={closeForm} onSuccess={fetchData} />

      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Clients &amp; Mandats</Title>
          <Text c="dimmed" size="sm">Gérez vos clients et mandats</Text>
        </div>
        <Group>
          {isAdmin && (
            <Button
              leftSection={<IconDownload size={16} />}
              variant="outline"
              loading={exporting}
              onClick={handleExport}
            >
              Exporter CSV
            </Button>
          )}
          <Button leftSection={<IconPlus size={16} />} color="brand" onClick={openForm}>
            Nouveau client
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        {[
          { label: 'Clients totaux', value: stats.total, icon: IconUsers, color: '#AB8E3D' },
          { label: 'Mandats actifs', value: stats.mandateCount, icon: IconBriefcase, color: '#3B82F6' },
          { label: 'CA total', value: formatCurrency(stats.revenue), icon: IconCoin, color: '#22C55E' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">{label}</Text>
                <Title order={2} mt={4}>{value}</Title>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" style={{ color }}>
                <Icon size={18} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Barre recherche + filtres */}
      <Group mb="sm" gap="sm">
        <TextInput
          placeholder="Rechercher par nom, email, société... (debounce 300ms)"
          leftSection={<IconSearch size={16} />}
          value={searchInput}
          onChange={e => setSearchInput(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button
          variant={hasActiveFilters ? 'filled' : 'outline'}
          color={hasActiveFilters ? 'brand' : 'gray'}
          leftSection={<IconFilter size={16} />}
          onClick={toggleFilters}
        >
          Filtres {hasActiveFilters && `(${activeFilterCount})`}
        </Button>
      </Group>

      <Collapse in={filtersOpened}>
        <Card withBorder padding="sm" radius="md" mb="md">
          <Group gap="sm" wrap="wrap" align="flex-end">
            <Select
              label="Statut"
              placeholder="Tous"
              clearable
              value={filterStatus}
              onChange={setFilterStatus}
              data={[
                { value: 'ACTIF', label: 'Actif' },
                { value: 'PROSPECT', label: 'Prospect' },
                { value: 'INACTIF', label: 'Inactif' },
              ]}
              w={140}
              size="sm"
            />
            <Select
              label="Source"
              placeholder="Toutes"
              clearable
              value={filterSource}
              onChange={setFilterSource}
              data={[
                { value: 'WP', label: 'WordPress' },
                { value: 'CRM', label: 'CRM uniquement' },
              ]}
              w={160}
              size="sm"
            />
            <TextInput
              label="Créé depuis"
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.currentTarget.value)}
              w={150}
              size="sm"
            />
            <TextInput
              label="Créé jusqu'au"
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.currentTarget.value)}
              w={150}
              size="sm"
            />
            <Checkbox
              label="Avec mandats actifs"
              checked={hasActiveMandats}
              onChange={e => setHasActiveMandats(e.currentTarget.checked)}
              mt="lg"
            />
            {hasActiveFilters && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                mt="lg"
                onClick={() => {
                  setFilterStatus(null);
                  setFilterSource(null);
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setHasActiveMandats(false);
                }}
              >
                Réinitialiser
              </Button>
            )}
          </Group>
        </Card>
      </Collapse>

      {/* Table */}
      <Card withBorder padding="md" radius="md">
        <Group justify="space-between" mb="sm">
          <Text size="sm" c="dimmed">
            {total} client{total !== 1 ? 's' : ''} — page {page}/{totalPages}
          </Text>
          {loading && <Loader size="xs" />}
        </Group>

        <ScrollArea>
          <Table horizontalSpacing="sm" verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                {([
                  { field: 'lastName', label: 'Nom' },
                  { field: 'email', label: 'Email' },
                  { field: null, label: 'Téléphone' },
                  { field: null, label: 'Mandats actifs' },
                  { field: 'createdAt', label: 'Création' },
                  { field: 'status', label: 'Statut' },
                  { field: null, label: 'Source' },
                  { field: null, label: '' },
                ] as { field: SortField | null; label: string }[]).map(({ field, label }) => (
                  <Table.Th
                    key={label}
                    onClick={field ? () => handleSort(field) : undefined}
                    style={{ cursor: field ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                  >
                    <Group gap={4} wrap="nowrap">
                      {label}
                      {field && <SortIcon field={field} sortBy={sortBy} sortOrder={sortOrder} />}
                    </Group>
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {clients.length > 0 ? clients.map(client => (
                <Table.Tr key={client.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <div>
                        <Group gap={4} wrap="nowrap">
                          <Text size="sm" fw={500}>{client.firstName} {client.lastName}</Text>
                          {duplicateIds.has(client.id) && (
                            <Tooltip label="Doublon potentiel détecté" position="right">
                              <ActionIcon size="xs" color="orange" variant="light" radius="xl">
                                <IconAlertTriangle size={10} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                        {client.company && <Text size="xs" c="dimmed">{client.company}</Text>}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td><Text size="sm">{client.email}</Text></Table.Td>
                  <Table.Td><Text size="sm" c={client.phone ? undefined : 'dimmed'}>{client.phone ?? '—'}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={client.mandats && client.mandats.length > 0 ? 'green' : 'gray'} size="sm">
                      {client.mandats?.length ?? 0}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{new Date(client.createdAt).toLocaleDateString('fr-CH')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={STATUS_COLOR[client.status] ?? 'gray'} variant="light" size="sm">
                      {client.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={client.wpId ? 'violet' : 'gray'} variant="dot" size="sm">
                      {client.wpId ? 'WordPress' : 'CRM'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light" onClick={() => navigate(`/clients/${client.id}`)}>Détails</Button>
                  </Table.Td>
                </Table.Tr>
              )) : (
                <Table.Tr>
                  <Table.Td colSpan={8} style={{ textAlign: 'center' }}>
                    <Text c="dimmed" size="sm" py="md">Aucun client trouvé</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
          </Group>
        )}
      </Card>
    </Box>
  );
}
