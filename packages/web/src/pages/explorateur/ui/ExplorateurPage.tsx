import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Title, Text, Group, Button, Card, Grid, ActionIcon,
  Badge, Loader, Center, Modal, Stack, Divider, TextInput,
  Menu, Progress, Tooltip, SegmentedControl, ScrollArea,
  ThemeIcon, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft, IconFolder, IconFolderPlus, IconUpload,
  IconGridDots, IconList, IconPhoto, IconVideo, IconFile,
  IconFileTypePdf, IconDots, IconDownload, IconPencil,
  IconTrash, IconChevronLeft, IconChevronRight,
  IconMapPin, IconCalendar, IconCamera,
} from '@tabler/icons-react';
import { MandatApi, Mandat } from '../../../shared/api/mandat';
import { FileApi, FileItem, FileMetadata, formatSize, isImage, isVideo } from '../../../shared/api/file';
import { api } from '../../../shared/api/base';

// ── Types ─────────────────────────────────────────────────────────────────

interface Dossier {
  id: string;
  name: string;
  mandatId: string;
  parentId?: string | null;
  isSystem: boolean;
  children?: Dossier[];
}

interface UploadState {
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildTree(dossiers: Dossier[], parentId: string | null = null): Dossier[] {
  return dossiers
    .filter(d => (d.parentId ?? null) === parentId)
    .map(d => ({ ...d, children: buildTree(dossiers, d.id) }));
}

function FileIcon({ mimeType, size = 32 }: { mimeType: string; size?: number }) {
  if (isImage(mimeType)) return <IconPhoto size={size} />;
  if (isVideo(mimeType)) return <IconVideo size={size} />;
  if (mimeType === 'application/pdf') return <IconFileTypePdf size={size} />;
  return <IconFile size={size} />;
}

function totalFolderSize(files: FileItem[]) {
  return files.reduce((s, f) => s + f.size, 0);
}

// ── Folder Tree Node ──────────────────────────────────────────────────────

function FolderNode({
  dossier,
  depth,
  selected,
  onSelect,
  fileCounts,
}: {
  dossier: Dossier;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
  fileCounts: Record<string, number>;
}) {
  const isSelected = selected === dossier.id;
  return (
    <div>
      <Group
        gap="xs"
        px="sm"
        py={6}
        pl={8 + depth * 16}
        style={{
          cursor: 'pointer',
          borderRadius: 6,
          background: isSelected ? 'rgba(171,142,61,0.12)' : 'transparent',
          borderLeft: isSelected ? '2px solid #AB8E3D' : '2px solid transparent',
        }}
        onClick={() => onSelect(dossier.id)}
      >
        <ThemeIcon size="xs" variant="light" color={dossier.isSystem ? 'blue' : 'yellow'}>
          <IconFolder size={12} />
        </ThemeIcon>
        <Text size="sm" style={{ flex: 1 }} truncate>{dossier.name}</Text>
        {fileCounts[dossier.id] !== undefined && (
          <Badge size="xs" variant="light" color="gray">{fileCounts[dossier.id]}</Badge>
        )}
      </Group>
      {dossier.children?.map(c => (
        <FolderNode key={c.id} dossier={c} depth={depth + 1} selected={selected} onSelect={onSelect} fileCounts={fileCounts} />
      ))}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────

function Lightbox({
  file,
  files,
  onClose,
  onNav,
}: {
  file: FileItem;
  files: FileItem[];
  onClose: () => void;
  onNav: (f: FileItem) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<FileMetadata | null>(null);
  const [loadingBlob, setLoadingBlob] = useState(true);

  const idx = files.findIndex(f => f.id === file.id);

  useEffect(() => {
    setBlobUrl(null);
    setMeta(null);
    setLoadingBlob(true);
    Promise.all([
      FileApi.getBlobUrl(file.id),
      FileApi.getMetadata(file.id),
    ]).then(([url, m]) => {
      setBlobUrl(url);
      setMeta(m);
    }).catch(console.error).finally(() => setLoadingBlob(false));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const exif = meta?.exif as Record<string, unknown> | null;
  const make = exif?.Make as string ?? exif?.make as string ?? null;
  const model = exif?.Model as string ?? exif?.model as string ?? null;
  const dateStr = exif?.DateTimeOriginal
    ? new Date(exif.DateTimeOriginal as string).toLocaleString('fr-FR')
    : null;

  return (
    <Modal
      opened
      onClose={onClose}
      size="90vw"
      title={
        <Group gap="sm">
          <FileIcon mimeType={file.mimeType} size={16} />
          <Text fw={600} size="sm" truncate maw={400}>{file.name}</Text>
          <Badge size="xs" variant="outline">{formatSize(file.size)}</Badge>
        </Group>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Grid m={0}>
        {/* Media viewer */}
        <Grid.Col span={{ base: 12, md: 8 }} style={{ background: '#0a0a0a', minHeight: 500, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loadingBlob && <Loader color="brand" />}
          {!loadingBlob && blobUrl && isImage(file.mimeType) && (
            <img src={blobUrl} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} alt={file.name} />
          )}
          {!loadingBlob && blobUrl && isVideo(file.mimeType) && (
            <video src={blobUrl} controls style={{ maxWidth: '100%', maxHeight: 500 }} />
          )}
          {!loadingBlob && !isImage(file.mimeType) && !isVideo(file.mimeType) && (
            <Stack align="center" gap="xs">
              <FileIcon mimeType={file.mimeType} size={64} />
              <Text c="dimmed" size="sm">{file.name}</Text>
            </Stack>
          )}

          {/* Nav arrows */}
          {idx > 0 && (
            <ActionIcon style={{ position: 'absolute', left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 44, height: 44 }}
              onClick={() => onNav(files[idx - 1])}>
              <IconChevronLeft size={24} color="#fff" />
            </ActionIcon>
          )}
          {idx < files.length - 1 && (
            <ActionIcon style={{ position: 'absolute', right: 12, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 44, height: 44 }}
              onClick={() => onNav(files[idx + 1])}>
              <IconChevronRight size={24} color="#fff" />
            </ActionIcon>
          )}
        </Grid.Col>

        {/* EXIF Sidebar */}
        <Grid.Col span={{ base: 12, md: 4 }} p="md">
          <Stack gap="sm">
            <Text fw={600} size="sm">Métadonnées</Text>
            <Divider />
            {[
              { icon: IconCalendar, label: 'Date', value: dateStr },
              { icon: IconCamera, label: 'Appareil', value: make ? `${make} ${model ?? ''}`.trim() : null },
              { icon: IconMapPin, label: 'GPS', value: meta?.geo.lat ? `${meta.geo.lat.toFixed(5)}, ${meta.geo.lng?.toFixed(5)}` : null },
            ].map(({ icon: Icon, label, value }) => value && (
              <Group key={label} gap="sm" align="flex-start">
                <ThemeIcon size="sm" variant="light" color="brand"><Icon size={12} /></ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed">{label}</Text>
                  <Text size="xs" fw={500}>{value}</Text>
                </div>
              </Group>
            ))}
            <Divider />
            <Text size="xs" c="dimmed">Créé le {new Date(file.createdAt).toLocaleDateString('fr-CH')}</Text>
            <Text size="xs" c="dimmed">Source : {file.userId ? 'Import Manuel' : 'Nikon Cloud'}</Text>
            <Text size="xs" c="dimmed">{idx + 1} / {files.length} dans ce dossier</Text>
          </Stack>
        </Grid.Col>
      </Grid>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export function ExplorateurPage() {
  const { id: mandatId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mandat, setMandat] = useState<Mandat | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxFile, setLightboxFile] = useState<FileItem | null>(null);
  const [renameModal, { open: openRename, close: closeRename }] = useDisclosure(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [renameName, setRenameName] = useState('');
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load mandat + dossiers
  useEffect(() => {
    if (!mandatId) return;
    setLoading(true);
    MandatApi.getById(mandatId).then(m => {
      setMandat(m);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dos = (m as any).dossiers as Dossier[] ?? [];
      setDossiers(dos);
      if (dos.length > 0) setSelectedFolderId(dos[0].id);
    }).catch(console.error).finally(() => setLoading(false));
  }, [mandatId]);

  // Load files when folder changes
  const loadFiles = useCallback(async (folderId: string) => {
    setFilesLoading(true);
    try {
      const data = await FileApi.listInFolder(folderId);
      setFiles(data);
      setFileCounts(prev => ({ ...prev, [folderId]: data.length }));
    } catch { setFiles([]); }
    finally { setFilesLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedFolderId) loadFiles(selectedFolderId);
  }, [selectedFolderId, loadFiles]);

  // Upload files
  const uploadFiles = async (fileList: File[]) => {
    if (!selectedFolderId) return;
    const limited = fileList.slice(0, 10); // max 10 simultaneous

    const newUploads = new Map(uploads);
    limited.forEach(f => newUploads.set(f.name, { name: f.name, progress: 0, status: 'uploading' }));
    setUploads(new Map(newUploads));

    await Promise.allSettled(
      limited.map(async f => {
        try {
          await FileApi.upload(selectedFolderId, f, pct => {
            setUploads(prev => {
              const next = new Map(prev);
              next.set(f.name, { name: f.name, progress: pct, status: 'uploading' });
              return next;
            });
          });
          setUploads(prev => {
            const next = new Map(prev);
            next.set(f.name, { name: f.name, progress: 100, status: 'done' });
            return next;
          });
        } catch {
          setUploads(prev => {
            const next = new Map(prev);
            next.set(f.name, { name: f.name, progress: 0, status: 'error', error: 'Échec' });
            return next;
          });
        }
      })
    );

    await loadFiles(selectedFolderId);
    setTimeout(() => setUploads(new Map()), 3000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) uploadFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) uploadFiles(files);
    e.target.value = '';
  };

  const handleDelete = async (file: FileItem) => {
    await FileApi.remove(file.id);
    if (selectedFolderId) loadFiles(selectedFolderId);
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameName.trim()) return;
    await FileApi.rename(renameTarget.id, renameName.trim());
    closeRename();
    if (selectedFolderId) loadFiles(selectedFolderId);
  };

  const handleDownload = async (file: FileItem) => {
    const { url } = await api.get(`/files/${file.id}/download`).then(r => r.data);
    const link = document.createElement('a');
    link.href = url.startsWith('/api') ? `http://localhost:3000${url}` : url;
    link.download = file.name;
    link.click();
  };

  const tree = buildTree(dossiers);
  const selectedDossier = dossiers.find(d => d.id === selectedFolderId);
  const activeUploads = Array.from(uploads.values());

  if (loading) return <Center style={{ minHeight: '60vh' }}><Loader /></Center>;
  if (!mandat) return <Alert color="red">Mandat introuvable.</Alert>;

  return (
    <Box p="md">
      <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileInput} />

      {/* Lightbox */}
      {lightboxFile && (
        <Lightbox
          file={lightboxFile}
          files={files.filter(f => isImage(f.mimeType) || isVideo(f.mimeType))}
          onClose={() => setLightboxFile(null)}
          onNav={setLightboxFile}
        />
      )}

      {/* Rename Modal */}
      <Modal opened={renameModal} onClose={closeRename} title="Renommer le fichier" size="sm">
        <TextInput
          label="Nouveau nom"
          value={renameName}
          onChange={e => setRenameName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
          mb="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={closeRename}>Annuler</Button>
          <Button color="brand" onClick={handleRenameSubmit} disabled={!renameName.trim()}>Renommer</Button>
        </Group>
      </Modal>

      {/* Header */}
      <Group mb="lg">
        <ActionIcon variant="subtle" onClick={() => navigate('/mandats')}>
          <IconArrowLeft size={18} />
        </ActionIcon>
        <div>
          <Title order={2}>Explorateur</Title>
          <Text size="sm" c="dimmed">{mandat.title}</Text>
        </div>
      </Group>

      <Grid gutter="md">
        {/* Left: Folder Tree */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card withBorder padding="sm" radius="md" h="100%">
            <Group justify="space-between" mb="sm">
              <Text fw={600} size="sm">Dossiers</Text>
              <Tooltip label="Nouveau dossier">
                <ActionIcon size="sm" variant="light" color="brand">
                  <IconFolderPlus size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <ScrollArea h={500}>
              {tree.map(d => (
                <FolderNode
                  key={d.id}
                  dossier={d}
                  depth={0}
                  selected={selectedFolderId}
                  onSelect={setSelectedFolderId}
                  fileCounts={fileCounts}
                />
              ))}
            </ScrollArea>
          </Card>
        </Grid.Col>

        {/* Right: File Browser */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          <Card withBorder padding="md" radius="md">
            {/* Toolbar */}
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <ThemeIcon size="sm" variant="light" color="yellow"><IconFolder size={14} /></ThemeIcon>
                <Text fw={600} size="sm">{selectedDossier?.name ?? '—'}</Text>
                {files.length > 0 && (
                  <Text size="xs" c="dimmed">
                    {files.length} fichier{files.length > 1 ? 's' : ''} · {formatSize(totalFolderSize(files))}
                  </Text>
                )}
              </Group>
              <Group gap="sm">
                <SegmentedControl
                  size="xs"
                  value={view}
                  onChange={v => setView(v as 'grid' | 'list')}
                  data={[
                    { value: 'grid', label: <IconGridDots size={14} /> },
                    { value: 'list', label: <IconList size={14} /> },
                  ]}
                />
                <Button
                  size="xs"
                  leftSection={<IconUpload size={14} />}
                  color="brand"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Importer
                </Button>
              </Group>
            </Group>

            {/* Upload progress */}
            {activeUploads.length > 0 && (
              <Stack gap="xs" mb="md">
                {activeUploads.map(u => (
                  <div key={u.name}>
                    <Group justify="space-between" mb={2}>
                      <Text size="xs" truncate maw={300}>{u.name}</Text>
                      <Badge size="xs" color={u.status === 'done' ? 'green' : u.status === 'error' ? 'red' : 'blue'}>
                        {u.status === 'done' ? '✓' : u.status === 'error' ? '✗' : `${u.progress}%`}
                      </Badge>
                    </Group>
                    <Progress value={u.progress} size="xs" color={u.status === 'error' ? 'red' : 'brand'} />
                  </div>
                ))}
              </Stack>
            )}

            {/* Drop zone */}
            <Box
              style={{
                border: `2px dashed ${isDragOver ? '#AB8E3D' : '#e9ecef'}`,
                borderRadius: 8,
                padding: isDragOver ? '8px' : '0',
                background: isDragOver ? 'rgba(171,142,61,0.04)' : 'transparent',
                transition: 'all 0.2s',
                minHeight: filesLoading ? 200 : undefined,
              }}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              {filesLoading ? (
                <Center py="xl"><Loader size="sm" /></Center>
              ) : files.length === 0 ? (
                <Stack align="center" py="xl" gap="xs">
                  <IconUpload size={32} opacity={0.3} />
                  <Text c="dimmed" size="sm">Déposez des fichiers ici ou cliquez sur Importer</Text>
                  <Text c="dimmed" size="xs">Jusqu&apos;à 10 fichiers simultanés · 500 MB max par fichier</Text>
                </Stack>
              ) : view === 'grid' ? (
                /* Grid View */
                <Grid gutter="sm">
                  {files.map(file => (
                    <Grid.Col key={file.id} span={{ base: 6, sm: 4, md: 3 }}>
                      <FileCard
                        file={file}
                        onOpen={() => (isImage(file.mimeType) || isVideo(file.mimeType)) && setLightboxFile(file)}
                        onRename={() => { setRenameTarget(file); setRenameName(file.name); openRename(); }}
                        onDelete={() => handleDelete(file)}
                        onDownload={() => handleDownload(file)}
                      />
                    </Grid.Col>
                  ))}
                </Grid>
              ) : (
                /* List View */
                <Stack gap={0}>
                  {files.map((file, i) => (
                    <div key={file.id}>
                      {i > 0 && <Divider />}
                      <FileRow
                        file={file}
                        onOpen={() => (isImage(file.mimeType) || isVideo(file.mimeType)) && setLightboxFile(file)}
                        onRename={() => { setRenameTarget(file); setRenameName(file.name); openRename(); }}
                        onDelete={() => handleDelete(file)}
                        onDownload={() => handleDownload(file)}
                      />
                    </div>
                  ))}
                </Stack>
              )}
            </Box>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}

// ── File Card (Grid) ──────────────────────────────────────────────────────

function FileCard({
  file, onOpen, onRename, onDelete, onDownload,
}: { file: FileItem; onOpen: () => void; onRename: () => void; onDelete: () => void; onDownload: () => void }) {
  return (
    <Card withBorder padding="xs" radius="md" style={{ cursor: 'pointer' }}>
      <Box
        style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa', borderRadius: 6 }}
        onClick={onOpen}
      >
        <FileIcon mimeType={file.mimeType} size={36} />
      </Box>
      <Group justify="space-between" mt={6} wrap="nowrap">
        <Text size="xs" truncate style={{ flex: 1 }}>{file.name}</Text>
        <FileMenu onRename={onRename} onDelete={onDelete} onDownload={onDownload} />
      </Group>
      <Text size="xs" c="dimmed">{formatSize(file.size)}</Text>
    </Card>
  );
}

// ── File Row (List) ───────────────────────────────────────────────────────

function FileRow({
  file, onOpen, onRename, onDelete, onDownload,
}: { file: FileItem; onOpen: () => void; onRename: () => void; onDelete: () => void; onDownload: () => void }) {
  return (
    <Group py="sm" px={4} justify="space-between" wrap="nowrap">
      <Group gap="sm" style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onOpen}>
        <ThemeIcon size="md" variant="light" color="brand"><FileIcon mimeType={file.mimeType} size={14} /></ThemeIcon>
        <div style={{ minWidth: 0 }}>
          <Text size="sm" truncate>{file.name}</Text>
          <Text size="xs" c="dimmed">{formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString('fr-CH')}</Text>
        </div>
      </Group>
      <Group gap={4}>
        {(file.geoLat || file.exifData) && <Badge size="xs" color="green" variant="dot">EXIF</Badge>}
        <FileMenu onRename={onRename} onDelete={onDelete} onDownload={onDownload} />
      </Group>
    </Group>
  );
}

// ── File Context Menu ─────────────────────────────────────────────────────

function FileMenu({ onRename, onDelete, onDownload }: { onRename: () => void; onDelete: () => void; onDownload: () => void }) {
  return (
    <Menu shadow="md" width={160}>
      <Menu.Target>
        <ActionIcon size="xs" variant="subtle" onClick={e => e.stopPropagation()}>
          <IconDots size={14} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconDownload size={12} />} onClick={onDownload}>Télécharger</Menu.Item>
        <Menu.Item leftSection={<IconPencil size={12} />} onClick={onRename}>Renommer</Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconTrash size={12} />} color="red" onClick={onDelete}>Supprimer</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
