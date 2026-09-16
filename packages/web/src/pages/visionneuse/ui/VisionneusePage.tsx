import { useState, useEffect, useRef } from 'react';
import {
  Box, Title, Text, Group, Button, Grid, Card, Stack,
  Badge, ActionIcon, Alert, Loader, Center, Select,
} from '@mantine/core';
import {
  IconChevronLeft, IconChevronRight, IconCheck, IconCopy,
  IconMap, IconArrowLeft, IconAlertCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { api } from '../../../shared/api/base';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker icons
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

// @ts-expect-error leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const GOLD = '#AB8E3D';
const GOLD_BORDER = 'rgba(171, 142, 61, 0.3)';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface GeoFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  folderId: string;
  userId?: string;
  createdAt: string;
  geoLat: number;
  geoLng: number;
  exifData: Record<string, unknown> | null;
}

interface MandatOption {
  value: string;
  label: string;
}

// ── Mini-carte dans la sidebar visionneuse ──────────────────────────────────

function EvidenceMiniMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
        .setView([lat, lng], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
      markerRef.current = L.marker([lat, lng]).addTo(map);
      mapRef.current = map;
    } else {
      mapRef.current.setView([lat, lng], 14);
      markerRef.current?.setLatLng([lat, lng]);
    }
    setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => { mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <Box style={{ height: 180, borderRadius: 8, overflow: 'hidden', border: `1px solid ${GOLD_BORDER}` }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
}

// ── Visionneuse fichier + EXIF ──────────────────────────────────────────────

function EvidenceViewer({ file, geoFiles, token, onSelect }: {
  file: GeoFile;
  geoFiles: GeoFile[];
  token: string | null;
  onSelect: (f: GeoFile) => void;
}) {
  const [copied, setCopied] = useState(false);

  const folderFiles = geoFiles.filter(f => f.folderId === file.folderId);
  const idx = folderFiles.findIndex(f => f.id === file.id);
  const fileUrl = `${API_URL}/files/stream/${file.id}?token=${token}`;
  const isImage = /\.(jpg|jpeg|png|heic|heif)$/i.test(file.name);
  const isVideo = /\.(mp4|mov|webm)$/i.test(file.name);

  const exif = (file.exifData || {}) as Record<string, string>;
  const make     = exif.Make     || exif.make     || 'Inconnu';
  const model    = exif.Model    || exif.model    || 'Inconnu';
  const software = exif.Software || exif.software || 'Inconnu';
  const dateStr  = exif.DateTimeOriginal
    ? new Date(exif.DateTimeOriginal).toLocaleString('fr-FR')
    : new Date(file.createdAt).toLocaleString('fr-FR');
  const lat = file.geoLat;
  const lng = file.geoLng;

  const formatSize = (b: number) => {
    if (!b) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return (b / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const exifText = `--- MÉTADONNÉES DE LA PREUVE ---
Fichier : ${file.name}
Date/Heure : ${dateStr}
Constructeur : ${make}
Modèle : ${model}
Logiciel : ${software}
Source : ${file.userId ? 'Import Manuel' : 'Nikon Cloud'}
Coordonnées GPS : ${lat ? lat.toFixed(6) : 'N/A'}, ${lng ? lng.toFixed(6) : 'N/A'}
---------------------------------`;

  const handleCopy = () => {
    navigator.clipboard.writeText(exifText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Grid mt="xs">
      {/* Média */}
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Box style={{
          position: 'relative', height: 480, backgroundColor: '#0a0a0a',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <ActionIcon
            variant="filled" color="dark" onClick={() => onSelect(folderFiles[idx - 1])}
            disabled={idx <= 0}
            style={{ position: 'absolute', left: 16, zIndex: 10, width: 44, height: 44, borderRadius: '50%', opacity: idx > 0 ? 1 : 0.3 }}
          >
            <IconChevronLeft size={24} color="#fff" />
          </ActionIcon>

          {isImage && <img src={fileUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={file.name} />}
          {isVideo && <video src={fileUrl} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
          {!isImage && !isVideo && <Text c="dimmed">Format non pris en charge.</Text>}

          <ActionIcon
            variant="filled" color="dark" onClick={() => onSelect(folderFiles[idx + 1])}
            disabled={idx >= folderFiles.length - 1}
            style={{ position: 'absolute', right: 16, zIndex: 10, width: 44, height: 44, borderRadius: '50%', opacity: idx < folderFiles.length - 1 ? 1 : 0.3 }}
          >
            <IconChevronRight size={24} color="#fff" />
          </ActionIcon>
        </Box>
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {idx + 1} / {folderFiles.length} — {file.name}
        </Text>
      </Grid.Col>

      {/* Infos + EXIF */}
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="md">
          <Box>
            <Text fw={700} size="sm" style={{ wordBreak: 'break-all' }}>{file.name}</Text>
            <Group gap="xs" mt={4}>
              <Badge color="brand" variant="outline" style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                {file.name.split('.').pop()?.toUpperCase()}
              </Badge>
              <Text size="xs" c="dimmed">{formatSize(file.size)}</Text>
            </Group>
          </Box>

          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={500}>Source :</Text>
            <Badge color={file.userId ? 'blue' : 'teal'} variant="filled" size="sm">
              {file.userId ? 'Import Manuel' : 'Nikon Cloud'}
            </Badge>
          </Group>

          {lat !== null && lng !== null ? (
            <Box>
              <Text size="xs" c="dimmed" fw={500} mb={4}>Localisation GPS :</Text>
              <EvidenceMiniMap lat={lat} lng={lng} />
            </Box>
          ) : (
            <Alert icon={<IconAlertCircle size={16} />} title="Avertissement" color="yellow">Aucune coordonnée GPS disponible.</Alert>
          )}

          <Box>
            <Text size="xs" fw={600} mb={4}>Métadonnées EXIF :</Text>
            <Card withBorder p="xs" radius="sm">
              <Stack gap={4}>
                {[
                  ['Date/Heure', dateStr],
                  ['Appareil', make],
                  ['Modèle', model],
                  ['Logiciel', software],
                  ...(lat && lng ? [['Position GPS', `${lat.toFixed(6)}, ${lng.toFixed(6)}`]] : []),
                ].map(([k, v]) => (
                  <Group key={k} justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">{k} :</Text>
                    <Text size="xs" fw={500} style={{ fontFamily: k === 'Position GPS' ? 'monospace' : undefined, textAlign: 'right', maxWidth: 140 }} truncate>
                      {v}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Box>

          <Button
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            color={copied ? 'teal' : undefined}
            style={{ backgroundColor: copied ? undefined : GOLD }}
            onClick={handleCopy}
            fullWidth
          >
            {copied ? 'Copié !' : 'Copier les métadonnées'}
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

// ── Carte principale (Leaflet) ──────────────────────────────────────────────

function MandateMap({ geoFiles, token, onOpen }: {
  geoFiles: GeoFile[];
  token: string | null;
  onOpen: (f: GeoFile) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || geoFiles.length === 0) return;
    if (instanceRef.current) { instanceRef.current.remove(); }

    const map = L.map(mapRef.current).setView([46.8182, 8.2275], 8);
    instanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', maxZoom: 20,
    }).addTo(map);

    const group = L.featureGroup();

    geoFiles.forEach(file => {
      const fileUrl = `${API_URL}/files/stream/${file.id}?token=${token}`;
      const isImg = /\.(jpg|jpeg|png|heic|heif)$/i.test(file.name);
      const isVid = /\.(mp4|mov|webm)$/i.test(file.name);
      const preview = isImg
        ? `<img src="${fileUrl}" style="max-width:100%;max-height:100px;border-radius:4px;margin-top:6px;display:block;" />`
        : isVid
        ? `<video src="${fileUrl}" controls style="max-width:100%;max-height:100px;border-radius:4px;margin-top:6px;display:block;"></video>`
        : '';

      const popup = `
        <div style="font-family:sans-serif;min-width:180px;font-size:12px;">
          <strong style="font-size:13px;word-break:break-all;">${file.name}</strong><br/>
          <span style="color:#666;font-size:10px;">${new Date(file.createdAt).toLocaleString('fr-FR')}</span>
          ${preview}
          <div style="font-size:10px;color:#888;margin-top:4px;">GPS : ${file.geoLat.toFixed(5)}, ${file.geoLng.toFixed(5)}</div>
          <button data-fileid="${file.id}" style="margin-top:8px;width:100%;padding:6px;background:${GOLD};color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">
            Ouvrir la visionneuse
          </button>
        </div>`;

      const marker = L.marker([file.geoLat, file.geoLng]).bindPopup(popup);
      marker.addTo(map);
      group.addLayer(marker);
    });

    // Use event delegation on the map to handle popup button clicks
    map.on('popupopen', (e: any) => {
      const popupNode = e.popup.getElement();
      if (!popupNode) return;
      
      const btn = popupNode.querySelector('button[data-fileid]') as HTMLButtonElement | null;
      if (btn) {
        btn.onclick = () => {
          const fileId = btn.getAttribute('data-fileid');
          if (!fileId) return;
          const file = geoFiles.find(f => f.id === fileId);
          if (file) {
            onOpen(file);
          }
        };
      }
    });

    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }

    return () => { instanceRef.current?.remove(); instanceRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoFiles, token]);

  if (geoFiles.length === 0) {
    return (
      <Alert color="blue" title="Aucune preuve géolocalisée">
        Ce mandat ne contient aucun fichier avec des coordonnées GPS.
      </Alert>
    );
  }

  return (
    <Box style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: 450, width: '100%' }} />
    </Box>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────

export function VisionneusePage() {
  const token = useAuthStore(s => s.accessToken);
  const navigate = useNavigate();

  const [mandats, setMandats] = useState<MandatOption[]>([]);
  const [selectedMandat, setSelectedMandat] = useState<string | null>(null);
  const [geoFiles, setGeoFiles] = useState<GeoFile[]>([]);
  const [activeFile, setActiveFile] = useState<GeoFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste des mandats
  useEffect(() => {
    api.get('/mandates?limit=50').then(r => {
      const items = (r.data.mandates ?? r.data.data ?? []) as Array<{ id: string; title: string }>;
      setMandats(items.map(m => ({ value: m.id, label: m.title })));
      if (items.length > 0) setSelectedMandat(items[0].id);
    }).catch(console.error);
  }, []);

  // Charger les fichiers géolocalisés du mandat sélectionné
  useEffect(() => {
    if (!selectedMandat) return;
    setLoading(true);
    setError(null);
    setActiveFile(null);
    setGeoFiles([]);

    api.get(`/mandates/${selectedMandat}/geo-files`)
      .then(r => {
        const files: GeoFile[] = r.data ?? [];
        setGeoFiles(files);
      })
      .catch(() => setError('Impossible de charger les preuves géolocalisées.'))
      .finally(() => setLoading(false));
  }, [selectedMandat]);

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <Group gap="sm">
          <ActionIcon variant="subtle" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} />
          </ActionIcon>
          <div>
            <Title order={2}>Visionneuse de preuves</Title>
            <Text c="dimmed" size="sm">Carte géolocalisée + métadonnées EXIF</Text>
          </div>
        </Group>
        <Group gap="sm">
          <IconMap size={18} color={GOLD} />
          <Select
            placeholder="Sélectionner un mandat..."
            data={mandats}
            value={selectedMandat}
            onChange={setSelectedMandat}
            searchable
            w={280}
            size="sm"
          />
        </Group>
      </Group>

      {loading && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Loader color="brand" />
            <Text size="sm" c="dimmed">Chargement des preuves géolocalisées...</Text>
          </Stack>
        </Center>
      )}

      {error && <Alert color="red" mb="md">{error}</Alert>}

      {!loading && !error && selectedMandat && (
        <>
          {/* Carte */}
          {!activeFile && (
            <>
              <Group justify="space-between" mb="sm">
                <Text fw={600}>
                  {geoFiles.length} preuve{geoFiles.length !== 1 ? 's' : ''} géolocalisée{geoFiles.length !== 1 ? 's' : ''}
                </Text>
                {geoFiles.length > 0 && (
                  <Badge color="green" variant="light">{geoFiles.length} fichier{geoFiles.length > 1 ? 's' : ''} avec GPS</Badge>
                )}
              </Group>
              <MandateMap geoFiles={geoFiles} token={token} onOpen={setActiveFile} />
            </>
          )}

          {/* Visionneuse */}
          {activeFile && (
            <>
              <Group mb="sm">
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={14} />}
                  onClick={() => setActiveFile(null)}
                  size="xs"
                >
                  Retour à la carte
                </Button>
                <Text size="sm" c="dimmed">
                  {geoFiles.length} preuve{geoFiles.length !== 1 ? 's' : ''} dans ce mandat
                </Text>
              </Group>
              <EvidenceViewer
                file={activeFile}
                geoFiles={geoFiles}
                token={token}
                onSelect={setActiveFile}
              />
            </>
          )}
        </>
      )}

      {!loading && !error && !selectedMandat && (
        <Alert color="blue">Sélectionnez un mandat pour visualiser ses preuves géolocalisées.</Alert>
      )}
    </Box>
  );
}
