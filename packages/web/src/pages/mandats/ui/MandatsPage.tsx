import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Title, Text, Group, Button, Card, Table, ScrollArea,
  Badge, Select, TextInput, Loader, Center, Avatar, ActionIcon,
  SegmentedControl, Tooltip, SimpleGrid,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconList, IconLayoutKanban, IconSearch,
  IconCalendar,
} from '@tabler/icons-react';
import { MandatApi, Mandat, MandatStatus } from '../../../shared/api/mandat';
import { MandatFormModal } from './MandatFormModal';
import { AssignEnqueteurModal } from './AssignEnqueteurModal';

// ── Helpers ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MandatStatus, { label: string; color: string; bg: string }> = {
  OUVERT:             { label: 'Ouvert',               color: 'gray',   bg: '#f1f3f5' },
  EN_COURS:           { label: 'En cours',             color: 'blue',   bg: '#e7f5ff' },
  EN_ATTENTE_PREUVES: { label: 'En attente preuves',   color: 'yellow', bg: '#fff9db' },
  A_VALIDER:          { label: 'À valider',            color: 'orange', bg: '#ffe8cc' },
  TERMINE:            { label: 'Terminé',              color: 'green',  bg: '#ebfbee' },
  ANNULE:             { label: 'Annulé',               color: 'red',    bg: '#ffe3e3' },
};

const KANBAN_COLUMNS: MandatStatus[] = ['OUVERT', 'EN_COURS', 'EN_ATTENTE_PREUVES', 'A_VALIDER', 'TERMINE'];

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function priorityColor(days: number) {
  if (days > 30) return 'red';
  if (days > 7) return 'yellow';
  return 'green';
}

function initials(m: Mandat) {
  if (!m.enqueteur) return '?';
  return `${m.enqueteur.firstName[0]}${m.enqueteur.lastName[0]}`.toUpperCase();
}

function clientName(m: Mandat) {
  if (!m.client) return '—';
  return `${m.client.firstName} ${m.client.lastName}`;
}

// ── Kanban Card ───────────────────────────────────────────────────────────

function KanbanCard({
  mandat,
  onDragStart,
}: {
  mandat: Mandat;
  onDragStart: (id: string) => void;
}) {
  const days = daysSince(mandat.createdAt);
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      mb="xs"
      draggable
      onDragStart={() => onDragStart(mandat.id)}
      style={{ cursor: 'grab' }}
    >
      <Text size="sm" fw={600} lineClamp={2} mb={4}>{mandat.title}</Text>
      <Text size="xs" c="dimmed" mb={6}>{clientName(mandat)}</Text>
      <Group justify="space-between">
        <Tooltip label={`${days} jours depuis ouverture`} position="bottom">
          <Badge size="xs" color={priorityColor(days)} variant="light">
            J+{days}
          </Badge>
        </Tooltip>
        {mandat.enqueteur && (
          <Tooltip label={`${mandat.enqueteur.firstName} ${mandat.enqueteur.lastName}`}>
            <Avatar size={22} radius="xl" color="brand">
              {initials(mandat)}
            </Avatar>
          </Tooltip>
        )}
      </Group>
    </Card>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  mandats,
  draggingId,
  onDragStart,
  onDrop,
}: {
  status: MandatStatus;
  mandats: Mandat[];
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDrop: (targetStatus: MandatStatus) => void;
}) {
  const [over, setOver] = useState(false);
  const cfg = STATUS_CONFIG[status];


  return (
    <Box style={{ flex: 1, minWidth: 220 }}>
      <Card
        withBorder
        padding="sm"
        radius="md"
        style={{
          background: over && draggingId ? 'rgba(171,142,61,0.08)' : cfg.bg,
          borderColor: over && draggingId ? '#AB8E3D' : undefined,
          minHeight: 400,
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={() => { setOver(false); onDrop(status); }}
      >
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <Badge color={cfg.color} variant="filled" size="sm">{cfg.label}</Badge>
          </Group>
          <Text size="xs" c="dimmed" fw={500}>{mandats.length}</Text>
        </Group>

        {mandats.map(m => (
          <KanbanCard
            key={m.id}
            mandat={m}
            onDragStart={onDragStart}
          />
        ))}

        {mandats.length === 0 && (
          <Text size="xs" c="dimmed" ta="center" pt="xl">
            Aucun mandat
          </Text>
        )}
      </Card>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function MandatsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
  const [selectedMandatForAssign, setSelectedMandatForAssign] = useState<string | null>(null);

  // Vue persistée en localStorage
  const [view, setView] = useState<'list' | 'kanban'>(
    () => (localStorage.getItem('mandats-view') as 'list' | 'kanban') ?? 'list'
  );

  // Filtres depuis l'URL
  const filterStatus = searchParams.get('status') ?? '';
  const filterSearch = searchParams.get('search') ?? '';

  // Drag & drop state
  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handleViewChange = (v: string) => {
    const mode = v as 'list' | 'kanban';
    setView(mode);
    localStorage.setItem('mandats-view', mode);
  };

  const fetchMandats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MandatApi.list({
        status: filterStatus as MandatStatus || undefined,
        limit: 200,
      });
      setMandats(data.mandates ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchMandats(); }, [fetchMandats]);

  // Filtre search côté client (debounce non nécessaire pour une liste déjà chargée)
  const filtered = mandats.filter(m => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      clientName(m).toLowerCase().includes(q) ||
      (m.enqueteur ? `${m.enqueteur.firstName} ${m.enqueteur.lastName}`.toLowerCase().includes(q) : false)
    );
  });

  // Kanban groupé par statut
  const byStatus = (status: MandatStatus) =>
    filtered.filter(m => m.status === status);

  const handleDragStart = (id: string) => {
    draggingIdRef.current = id;
    setDraggingId(id);
  };

  const handleDrop = async (targetStatus: MandatStatus) => {
    const id = draggingIdRef.current;
    draggingIdRef.current = null;
    setDraggingId(null);
    if (!id) return;

    const mandat = mandats.find(m => m.id === id);
    if (!mandat || mandat.status === targetStatus) return;

    // Optimistic update
    setMandats(prev =>
      prev.map(m => m.id === id ? { ...m, status: targetStatus } : m)
    );

    try {
      await MandatApi.update(id, { status: targetStatus });
    } catch {
      // Revert on error
      setMandats(prev =>
        prev.map(m => m.id === id ? { ...m, status: mandat.status } : m)
      );
    }
  };

  if (loading && mandats.length === 0) {
    return <Center style={{ minHeight: '60vh' }}><Loader /></Center>;
  }

  return (
    <Box p="md">
      <MandatFormModal opened={formOpened} onClose={closeForm} onSuccess={fetchMandats} />
      <AssignEnqueteurModal 
        opened={assignModalOpened} 
        onClose={closeAssignModal} 
        mandatId={selectedMandatForAssign} 
        onSuccess={fetchMandats} 
      />

      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Mandats</Title>
          <Text c="dimmed" size="sm">Gérez et suivez vos mandats d&apos;investigation</Text>
        </div>
        <Group>
          <SegmentedControl
            value={view}
            onChange={handleViewChange}
            data={[
              { value: 'list', label: <Group gap={4}><IconList size={14} /><span>Liste</span></Group> },
              { value: 'kanban', label: <Group gap={4}><IconLayoutKanban size={14} /><span>Kanban</span></Group> },
            ]}
            size="sm"
          />
          <Button leftSection={<IconPlus size={16} />} color="brand" onClick={openForm}>
            Nouveau mandat
          </Button>
        </Group>
      </Group>

      {/* Filtres (persistés dans l'URL) */}
      <Group mb="md" gap="sm">
        <TextInput
          placeholder="Rechercher titre, client, enquêteur..."
          leftSection={<IconSearch size={14} />}
          value={filterSearch}
          onChange={e => setFilter('search', e.currentTarget.value)}
          style={{ flex: 1 }}
          size="sm"
        />
        <Select
          placeholder="Tous statuts"
          clearable
          value={filterStatus || null}
          onChange={v => setFilter('status', v ?? '')}
          data={KANBAN_COLUMNS.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))}
          w={160}
          size="sm"
        />
        <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
          {filtered.length} mandat{filtered.length !== 1 ? 's' : ''}
        </Text>
      </Group>

      {/* ── Vue Liste ── */}
      {view === 'list' && (
        <Card withBorder padding="md" radius="md">
          <ScrollArea>
            <Table horizontalSpacing="sm" verticalSpacing="sm" striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Titre</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Enquêteur</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Priorité</Table.Th>
                  <Table.Th>Ouverture</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.length > 0 ? filtered.map(m => {
                  const days = daysSince(m.createdAt);
                  const cfg = STATUS_CONFIG[m.status];
                  return (
                    <Table.Tr key={m.id}>
                      <Table.Td>
                        <Text size="sm" fw={500} lineClamp={1} maw={220}>{m.title}</Text>
                        {m.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>{m.description}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{clientName(m)}</Text>
                        {m.client?.company && <Text size="xs" c="dimmed">{m.client.company}</Text>}
                      </Table.Td>
                      <Table.Td>
                        {m.enqueteur ? (
                          <Group 
                            gap="xs" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedMandatForAssign(m.id);
                              openAssignModal();
                            }}
                            title="Changer d'enquêteur"
                          >
                            <Avatar size={24} radius="xl" color="brand">
                              {initials(m)}
                            </Avatar>
                            <Text size="sm">{m.enqueteur.firstName} {m.enqueteur.lastName}</Text>
                          </Group>
                        ) : (
                          <Button 
                            size="compact-xs" 
                            variant="light" 
                            color="gray"
                            onClick={() => {
                              setSelectedMandatForAssign(m.id);
                              openAssignModal();
                            }}
                          >
                            Assigner
                          </Button>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={cfg.color} variant="light" size="sm">{cfg.label}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label={`${days} jours depuis ouverture`}>
                          <Badge color={priorityColor(days)} variant="dot" size="sm">
                            J+{days}
                          </Badge>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <ActionIcon size="xs" variant="subtle" title={new Date(m.createdAt).toLocaleDateString('fr-CH')}>
                            <IconCalendar size={12} />
                          </ActionIcon>
                          <Text size="xs" c="dimmed">{new Date(m.createdAt).toLocaleDateString('fr-CH')}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light">Voir</Button>
                      </Table.Td>
                    </Table.Tr>
                  );
                }) : (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                      <Text c="dimmed" size="sm" py="md">Aucun mandat trouvé</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* ── Vue Kanban ── */}
      {view === 'kanban' && (
        <Box>
          <Text size="xs" c="dimmed" mb="sm">
            Glissez-déposez les cartes pour changer le statut
          </Text>
          <ScrollArea type="scroll">
            <Group align="flex-start" gap="md" wrap="nowrap" pb="md">
              {KANBAN_COLUMNS.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  mandats={byStatus(status)}
                  draggingId={draggingId}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              ))}
            </Group>
          </ScrollArea>

          {/* Légende priorité */}
          <Card withBorder padding="xs" radius="md" mt="md">
            <Group gap="md">
              <Text size="xs" c="dimmed" fw={500}>Priorité (jours depuis ouverture) :</Text>
              {[
                { color: 'green', label: '0–7 j — Normal' },
                { color: 'yellow', label: '8–30 j — Attention' },
                { color: 'red', label: '31+ j — Urgent' },
              ].map(({ color, label }) => (
                <Group key={color} gap={4}>
                  <Badge color={color} variant="light" size="xs">J+N</Badge>
                  <Text size="xs" c="dimmed">{label}</Text>
                </Group>
              ))}
            </Group>
          </Card>
        </Box>
      )}

      {/* Résumé */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="md">
        {KANBAN_COLUMNS.map(status => {
          const cfg = STATUS_CONFIG[status];
          const count = mandats.filter(m => m.status === status).length;
          return (
            <Card key={status} withBorder padding="sm" radius="md">
              <Group justify="space-between">
                <Text size="xs" c="dimmed">{cfg.label}</Text>
                <Badge color={cfg.color} variant="light" size="sm">{count}</Badge>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
