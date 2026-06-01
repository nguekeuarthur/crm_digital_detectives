import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Group, Button, Card, Tabs, Badge,
  Avatar, Stack, Divider, TextInput, Select, Loader, Center,
  Textarea, ActionIcon, Pagination, ThemeIcon, Alert,
} from '@mantine/core';
import {
  IconArrowLeft, IconEdit, IconDeviceFloppy, IconX,
  IconBriefcase, IconMail, IconPhone, IconBrandWhatsapp,
  IconFolder, IconNote, IconActivity, IconWorld,
  IconPlus, IconAlertCircle, IconClock,
  IconUpload, IconFileText,
} from '@tabler/icons-react';
import { ClientApi, Client } from '../../../shared/api/client';
import { AuditApi, AuditLog } from '../../../shared/api/audit';

const STATUS_COLOR: Record<string, string> = { ACTIF: 'green', PROSPECT: 'blue', INACTIF: 'gray' };

const MANDATE_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Brouillon', color: 'gray' },
  ACTIVE:    { label: 'Actif',     color: 'green' },
  SUSPENDED: { label: 'Suspendu',  color: 'yellow' },
  CLOSED:    { label: 'Clôturé',   color: 'blue' },
};

const ACTION_LABEL: Record<string, { label: string; icon: typeof IconActivity; color: string }> = {
  CREATE:       { label: 'Création',        icon: IconPlus,       color: '#22C55E' },
  UPDATE:       { label: 'Modification',    icon: IconEdit,       color: '#3B82F6' },
  DELETE:       { label: 'Suppression',     icon: IconX,          color: '#EF4444' },
  NOTE:         { label: 'Note ajoutée',    icon: IconNote,       color: '#AB8E3D' },
  UPLOAD_FILE:  { label: 'Fichier ajouté',  icon: IconUpload,     color: '#8B5CF6' },
  ACCESS_DENIED:{ label: 'Accès refusé',   icon: IconAlertCircle,color: '#F59E0B' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(dateStr).toLocaleDateString('fr-CH');
}

interface Mandat {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  description?: string;
}

interface Note {
  id: string;
  newValue: { text: string } | unknown;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [mandats, setMandats] = useState<Mandat[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', company: '', address: '',
    status: 'PROSPECT' as 'PROSPECT' | 'ACTIF' | 'INACTIF',
  });

  const fetchClient = useCallback(async () => {
    if (!id) return;
    const c = await ClientApi.getById(id);
    setClient(c);
    setForm({
      firstName: c.firstName, lastName: c.lastName, email: c.email,
      phone: c.phone ?? '', company: c.company ?? '', address: c.address ?? '',
      status: c.status,
    });
  }, [id]);

  const fetchMandats = useCallback(async () => {
    if (!id) return;
    const data = await ClientApi.getMandates(id);
    setMandats(data as Mandat[]);
  }, [id]);

  const fetchNotes = useCallback(async () => {
    if (!id) return;
    const data = await ClientApi.getNotes(id);
    setNotes((data.logs ?? []) as Note[]);
  }, [id]);

  const fetchTimeline = useCallback(async (page = 1) => {
    if (!id) return;
    const data = await AuditApi.getLogs({ entity: 'Client', entityId: id, limit: 20, page });
    setTimeline(data.logs ?? []);
    setTimelineTotal(data.pagination?.totalPages ?? 1);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchClient(), fetchMandats(), fetchNotes(), fetchTimeline(1)])
      .finally(() => setLoading(false));
  }, [fetchClient, fetchMandats, fetchNotes, fetchTimeline]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await ClientApi.update(id, form);
      await fetchClient();
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await ClientApi.addNote(id, newNote.trim());
      setNewNote('');
      await fetchNotes();
      await fetchTimeline(1);
    } finally {
      setAddingNote(false);
    }
  };

  const handleTimelinePage = (p: number) => {
    setTimelinePage(p);
    fetchTimeline(p);
  };

  if (loading) return <Center style={{ minHeight: '60vh' }}><Loader /></Center>;
  if (!client) return <Alert color="red">Client introuvable.</Alert>;

  const initials = `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();

  return (
    <Box p="md">
      {/* Back */}
      <Group mb="md">
        <ActionIcon variant="subtle" onClick={() => navigate('/clients')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <Text size="sm" c="dimmed">Clients &amp; Mandats</Text>
      </Group>

      {/* En-tête client */}
      <Card withBorder padding="lg" radius="md" mb="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <Avatar size={64} radius="xl" color="brand">{initials}</Avatar>
            <div>
              <Group gap="xs" align="center">
                <Title order={2}>{client.firstName} {client.lastName}</Title>
                <Badge color={STATUS_COLOR[client.status] ?? 'gray'} variant="light">
                  {client.status}
                </Badge>
                {client.wpId && (
                  <Badge color="violet" variant="dot" leftSection={<IconWorld size={10} />}>
                    WP Sync
                  </Badge>
                )}
              </Group>
              <Group gap="lg" mt={4}>
                <Group gap={4}><IconMail size={14} /><Text size="sm">{client.email}</Text></Group>
                {client.phone && <Group gap={4}><IconPhone size={14} /><Text size="sm">{client.phone}</Text></Group>}
                {client.company && <Text size="sm" c="dimmed">{client.company}</Text>}
              </Group>
            </div>
          </Group>
          <Group>
            {editMode ? (
              <>
                <Button size="sm" variant="default" leftSection={<IconX size={14} />}
                  onClick={() => { setEditMode(false); setForm({ firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone ?? '', company: client.company ?? '', address: client.address ?? '', status: client.status }); }}>
                  Annuler
                </Button>
                <Button size="sm" color="brand" leftSection={<IconDeviceFloppy size={14} />}
                  loading={saving} onClick={handleSave}>
                  Sauvegarder
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" leftSection={<IconEdit size={14} />}
                onClick={() => setEditMode(true)}>
                Modifier
              </Button>
            )}
          </Group>
        </Group>
      </Card>

      {/* Onglets */}
      <Tabs defaultValue="info">
        <Tabs.List mb="md">
          <Tabs.Tab value="info" leftSection={<IconFileText size={14} />}>Informations</Tabs.Tab>
          <Tabs.Tab value="mandats" leftSection={<IconBriefcase size={14} />}>
            Mandats {mandats.length > 0 && <Badge size="xs" ml={4}>{mandats.length}</Badge>}
          </Tabs.Tab>
          <Tabs.Tab value="communications" leftSection={<IconMail size={14} />}>Communications</Tabs.Tab>
          <Tabs.Tab value="documents" leftSection={<IconFolder size={14} />}>Documents</Tabs.Tab>
          <Tabs.Tab value="notes" leftSection={<IconNote size={14} />}>
            Notes {notes.length > 0 && <Badge size="xs" ml={4}>{notes.length}</Badge>}
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Informations ── */}
        <Tabs.Panel value="info">
          <Card withBorder padding="md" radius="md">
            <Stack gap="md">
              <Group grow>
                <TextInput label="Prénom" value={form.firstName} disabled={!editMode}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
                <TextInput label="Nom" value={form.lastName} disabled={!editMode}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </Group>
              <TextInput label="Email" value={form.email} disabled={!editMode}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              <Group grow>
                <TextInput label="Téléphone" value={form.phone} disabled={!editMode}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                <TextInput label="Société" value={form.company} disabled={!editMode}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </Group>
              <TextInput label="Adresse" value={form.address} disabled={!editMode}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              <Select label="Statut" value={form.status} disabled={!editMode}
                onChange={v => setForm(p => ({ ...p, status: (v ?? 'PROSPECT') as typeof p.status }))}
                data={[
                  { value: 'PROSPECT', label: 'Prospect' },
                  { value: 'ACTIF', label: 'Actif' },
                  { value: 'INACTIF', label: 'Inactif' },
                ]}
              />
              {client.wpId && (
                <Group gap="xs">
                  <IconWorld size={14} />
                  <Text size="xs" c="dimmed">Synchronisé depuis WordPress (ID: {client.wpId})</Text>
                </Group>
              )}
              <Divider />
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">Créé le</Text>
                  <Text size="sm">{new Date(client.createdAt).toLocaleDateString('fr-CH')}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Modifié le</Text>
                  <Text size="sm">{new Date(client.updatedAt).toLocaleDateString('fr-CH')}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Mandats actifs</Text>
                  <Text size="sm">{mandats.filter(m => m.status === 'ACTIVE').length}</Text>
                </div>
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* ── Mandats ── */}
        <Tabs.Panel value="mandats">
          <Card withBorder padding="md" radius="md">
            {mandats.length > 0 ? (
              <Stack gap="sm">
                {mandats.map((m, i) => (
                  <div key={m.id}>
                    {i > 0 && <Divider />}
                    <Group justify="space-between" py="xs">
                      <div>
                        <Group gap="xs">
                          <Text fw={500} size="sm">{m.title}</Text>
                          <Badge color={MANDATE_STATUS[m.status]?.color ?? 'gray'} variant="light" size="sm">
                            {MANDATE_STATUS[m.status]?.label ?? m.status}
                          </Badge>
                        </Group>
                        {m.description && <Text size="xs" c="dimmed" mt={2}>{m.description}</Text>}
                        <Text size="xs" c="dimmed">Créé le {new Date(m.createdAt).toLocaleDateString('fr-CH')}</Text>
                      </div>
                      <Button size="xs" variant="light">Voir le mandat</Button>
                    </Group>
                  </div>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm" ta="center" py="xl">Aucun mandat pour ce client.</Text>
            )}
          </Card>
        </Tabs.Panel>

        {/* ── Communications ── */}
        <Tabs.Panel value="communications">
          <Card withBorder padding="md" radius="md">
            <Stack align="center" py="xl" gap="xs">
              <Group gap="md">
                <ThemeIcon size="xl" variant="light" color="blue"><IconMail size={20} /></ThemeIcon>
                <ThemeIcon size="xl" variant="light" color="green"><IconBrandWhatsapp size={20} /></ThemeIcon>
                <ThemeIcon size="xl" variant="light" color="orange"><IconPhone size={20} /></ThemeIcon>
              </Group>
              <Text fw={500}>Historique des communications</Text>
              <Text size="sm" c="dimmed">Disponible au sprint 6 — intégration emails, appels et WhatsApp.</Text>
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* ── Documents ── */}
        <Tabs.Panel value="documents">
          <Card withBorder padding="md" radius="md">
            {mandats.length > 0 ? (
              <Stack gap="sm">
                <Text size="sm" c="dimmed" mb="xs">
                  Fichiers accessibles via les mandats du client.
                </Text>
                {mandats.map(m => (
                  <Group key={m.id} justify="space-between" p="xs"
                    style={{ borderRadius: 6, background: 'rgba(0,0,0,0.02)' }}>
                    <Group gap="sm">
                      <ThemeIcon size="sm" variant="light" color="yellow"><IconFolder size={14} /></ThemeIcon>
                      <div>
                        <Text size="sm" fw={500}>{m.title}</Text>
                        <Text size="xs" c="dimmed">7 dossiers standards</Text>
                      </div>
                    </Group>
                    <Button size="xs" variant="light" leftSection={<IconFolder size={12} />}>
                      Ouvrir
                    </Button>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm" ta="center" py="xl">
                Aucun mandat — les documents sont rattachés aux mandats.
              </Text>
            )}
          </Card>
        </Tabs.Panel>

        {/* ── Notes ── */}
        <Tabs.Panel value="notes">
          <Stack gap="md">
            {/* Éditeur */}
            <Card withBorder padding="md" radius="md">
              <Text fw={500} mb="xs">Nouvelle note</Text>
              <Textarea
                placeholder="Saisir une note interne..."
                value={newNote}
                onChange={e => setNewNote(e.currentTarget.value)}
                minRows={3}
                mb="sm"
              />
              <Group justify="flex-end">
                <Button
                  size="sm"
                  color="brand"
                  leftSection={<IconPlus size={14} />}
                  loading={addingNote}
                  disabled={!newNote.trim()}
                  onClick={handleAddNote}
                >
                  Ajouter la note
                </Button>
              </Group>
            </Card>

            {/* Liste des notes */}
            {notes.length > 0 && (
              <Card withBorder padding="md" radius="md">
                <Text fw={500} mb="md">Notes ({notes.length})</Text>
                <Stack gap={0}>
                  {notes.map((note, i) => {
                    const text = (note.newValue as { text?: string })?.text ?? '';
                    const author = note.user
                      ? `${note.user.firstName} ${note.user.lastName}`
                      : 'Inconnu';
                    return (
                      <div key={note.id}>
                        {i > 0 && <Divider my="sm" />}
                        <Group gap="sm" align="flex-start">
                          <ThemeIcon size="sm" variant="light" color="brand" mt={2}>
                            <IconNote size={12} />
                          </ThemeIcon>
                          <div style={{ flex: 1 }}>
                            <Group justify="space-between" mb={2}>
                              <Text size="xs" fw={500}>{author}</Text>
                              <Text size="xs" c="dimmed">{timeAgo(note.createdAt)}</Text>
                            </Group>
                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{text}</Text>
                          </div>
                        </Group>
                      </div>
                    );
                  })}
                </Stack>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* ── Timeline d'activité ── */}
      <Card withBorder padding="md" radius="md" mt="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconActivity size={16} />
            <Text fw={600}>Timeline d&apos;activité</Text>
          </Group>
          <Text size="xs" c="dimmed">20 dernières actions</Text>
        </Group>

        {timeline.length > 0 ? (
          <Stack gap={0}>
            {timeline.map((log, i) => {
              const cfg = ACTION_LABEL[log.action] ?? { label: log.action, icon: IconActivity, color: '#6B7280' };
              const Icon = cfg.icon;
              return (
                <div key={log.id}>
                  {i > 0 && <Divider my="xs" />}
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon size="sm" variant="light" radius="xl"
                      style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }}>
                      <Icon size={12} />
                    </ThemeIcon>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap={4}>
                          <Text size="xs" fw={500}>{cfg.label}</Text>
                          <Text size="xs" c="dimmed">• {log.entity}</Text>
                        </Group>
                        <Group gap={4} style={{ flexShrink: 0 }}>
                          <IconClock size={10} />
                          <Text size="xs" c="dimmed">{timeAgo(log.createdAt)}</Text>
                        </Group>
                      </Group>
                      {log.user && (
                        <Text size="xs" c="dimmed">par {log.user.firstName} {log.user.lastName}</Text>
                      )}
                    </div>
                  </Group>
                </div>
              );
            })}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm" ta="center" py="md">Aucune activité enregistrée.</Text>
        )}

        {timelineTotal > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={timelineTotal} value={timelinePage} onChange={handleTimelinePage} size="sm" />
          </Group>
        )}
      </Card>
    </Box>
  );
}
