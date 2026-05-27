import { useState, useEffect, useRef } from 'react';
import { 
  AppShell, 
  Card, 
  Text, 
  Group, 
  Button, 
  Stack, 
  Modal, 
  TextInput, 
  Badge, 
  ActionIcon,
  Table,
  Loader,
  Alert,
  Box,
  Tabs
} from '@mantine/core';
import { IconPhoneCall, IconUserPlus, IconEye, IconX, IconBriefcase, IconMail, IconPhone, IconActivity, IconFolder, IconMapPin } from '@tabler/icons-react';
import { api } from '../../../shared/api/base';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Couleurs premium Gold & Dark du thème Digitaldetectives
const GOLD = '#AB8E3D';
const GOLD_BORDER = 'rgba(171, 142, 61, 0.35)';
const GOLD_GLOW = 'rgba(171, 142, 61, 0.15)';
const DARK_BG = 'rgba(17, 17, 17, 0.95)';

interface IncomingCallData {
  callId: string;
  phone: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    company: string | null;
    email: string;
  } | null;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  const wsRef = useRef<WebSocket | null>(null);

  // États CTI
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  
  // États Modal de consultation client
  const [clientModalId, setClientModalId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientDetails, setClientDetails] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientActivities, setClientActivities] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('mandats');

  // États Modal de visualisation de carte des preuves
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMandateForMap, setSelectedMandateForMap] = useState<any | null>(null);

  // États Modal de création rapide client
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Helper pour formater l'URL WebSocket à partir de l'URL d'API
  const getWsUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    let wsUrl = apiUrl.replace(/^http/, 'ws');
    wsUrl = wsUrl.replace(/\/api\/v1\/?$/, '/ws');
    return wsUrl;
  };

  // Connexion WebSocket en temps réel
  useEffect(() => {
    if (!token) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      return;
    }

    const connectWebSocket = () => {
      const url = getWsUrl();
      console.log(`🔌 [WS Client] Connexion à : ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 [WS Client] Connecté au serveur');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('🔌 [WS Client] Message reçu :', message);

          if (message.type === 'RINGOVER_CALL_STARTED') {
            setIncomingCall(message.data);
          } 
          else if (message.type === 'RINGOVER_CALL_ENDED') {
            // Si l'appel se termine, on masque la pop-up CTI
            setIncomingCall((current) => {
              if (current && current.callId === message.data.callId) {
                return null;
              }
              return current;
            });
          }
        } catch (err) {
          console.error('❌ [WS Client] Erreur lors du parsing du message :', err);
        }
      };

      ws.onclose = () => {
        console.log('🔌 [WS Client] Déconnecté. Reconnexion dans 5s...');
        setTimeout(() => {
          if (useAuthStore.getState().accessToken) {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (err) => {
        console.error('❌ [WS Client] Erreur :', err);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token]);

  // Charger les détails du client lorsque le modal de consultation s'ouvre
  useEffect(() => {
    if (!clientModalId) {
      setClientDetails(null);
      setClientActivities([]);
      return;
    }

    setLoadingDetails(true);
    Promise.all([
      api.get(`/clients/${clientModalId}`),
      api.get(`/clients/${clientModalId}/activity`)
    ])
      .then(([detailsRes, activityRes]) => {
        setClientDetails(detailsRes.data);
        setClientActivities(activityRes.data);
      })
      .catch((err) => {
        console.error('❌ [CTI] Erreur lors du chargement des détails du client :', err);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [clientModalId]);

  // Gérer la création rapide de client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomingCall) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const { data } = await api.post('/clients', {
        firstName: createFirstName,
        lastName: createLastName,
        email: createEmail,
        company: createCompany || undefined,
        phone: incomingCall.phone,
        status: 'PROSPECT'
      });

      // Mettre à jour l'identité du client dans l'appel entrant en cours
      setIncomingCall(prev => prev ? {
        ...prev,
        client: {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company || null,
          email: data.email
        }
      } : null);

      setIsCreateModalOpen(false);
      
      // Réinitialiser les champs du formulaire
      setCreateFirstName('');
      setCreateLastName('');
      setCreateEmail('');
      setCreateCompany('');

      // Ouvrir automatiquement la fiche du client fraîchement créé
      setClientModalId(data.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Impossible de créer le client';
      setCreateError(msg);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AppShell
      padding="xl"
      style={{ background: '#f8fafc', position: 'relative', minHeight: '100vh' }}
    >
      {/* Balise style pour l'animation d'onde sonore et pulse gold */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-gold {
          0% { transform: scale(1); filter: drop-shadow(0 0 2px ${GOLD}); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 15px ${GOLD}); }
          100% { transform: scale(1); filter: drop-shadow(0 0 2px ${GOLD}); }
        }
        .pulse-icon {
          animation: pulse-gold 1.5s infinite ease-in-out;
        }
      ` }} />

      <AppShell.Main>
        {children}
      </AppShell.Main>

      {/* ========================================== */}
      {/* POP-UP DE REAL-TIME CTI (Appel Entrant)   */}
      {/* ========================================== */}
      {incomingCall && (
        <Card
          shadow="xl"
          p="md"
          radius="md"
          withBorder
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 320,
            zIndex: 1000,
            backgroundColor: DARK_BG,
            color: '#fff',
            borderColor: GOLD_BORDER,
            boxShadow: `0 10px 30px ${GOLD_GLOW}`,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconPhoneCall color={GOLD} size={20} className="pulse-icon" />
              <Text fw={700} size="sm" c="brand.3" style={{ color: GOLD, letterSpacing: '0.5px' }}>
                CTI TELEPHONIE - APPEL ENTRANT
              </Text>
            </Group>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              size="xs" 
              onClick={() => setIncomingCall(null)}
              style={{ color: '#aaa' }}
            >
              <IconX size={16} />
            </ActionIcon>
          </Group>

          <Stack gap="xs" mt="sm">
            <Box>
              <Text size="xs" c="dimmed">NUMÉRO APPELANT</Text>
              <Text fw={700} size="lg" style={{ fontFamily: 'monospace' }}>
                {incomingCall.phone}
              </Text>
            </Box>

            <Box mt="xs">
              {incomingCall.client ? (
                <>
                  <Text size="xs" c="dimmed">CLIENT IDENTIFIÉ</Text>
                  <Text fw={700} size="md">
                    {incomingCall.client.firstName} {incomingCall.client.lastName}
                  </Text>
                  {incomingCall.client.company && (
                    <Text size="xs" c="dimmed">
                      Entreprise : {incomingCall.client.company}
                    </Text>
                  )}
                  <Badge color="green" variant="light" size="xs" mt={5}>Client connu</Badge>
                </>
              ) : (
                <>
                  <Text size="xs" c="dimmed">CLIENT</Text>
                  <Text fw={700} size="md" c="red.4">
                    Numéro inconnu
                  </Text>
                  <Badge color="red" variant="light" size="xs" mt={5}>Nouveau prospect</Badge>
                </>
              )}
            </Box>

            <Group mt="md" grow>
              {incomingCall.client ? (
                <Button 
                  leftSection={<IconEye size={16} />}
                  color="brand"
                  style={{ backgroundColor: GOLD }}
                  onClick={() => setClientModalId(incomingCall.client!.id)}
                >
                  Ouvrir la fiche
                </Button>
              ) : (
                <Button 
                  leftSection={<IconUserPlus size={16} />}
                  color="brand"
                  style={{ backgroundColor: GOLD }}
                  onClick={() => {
                    // Pré-remplir le mail et le nom/prenom si besoin
                    setIsCreateModalOpen(true);
                  }}
                >
                  Créer le client
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      )}

      {/* ========================================== */}
      {/* MODAL : FICHE DETAIL DU CLIENT            */}
      {/* ========================================== */}
      <Modal
        opened={!!clientModalId}
        onClose={() => setClientModalId(null)}
        title={
          <Group gap="xs">
            <IconEye color={GOLD} size={22} />
            <Text fw={700} size="lg">Fiche Client - Détails & Mandats</Text>
          </Group>
        }
        size="lg"
        radius="md"
        styles={{
          header: { borderBottom: `1px solid ${GOLD_BORDER}`, paddingBottom: '10px' },
          content: { border: `1px solid ${GOLD_BORDER}` }
        }}
      >
        {loadingDetails && (
          <Stack align="center" py="xl">
            <Loader color="brand" size="md" />
            <Text size="sm" c="dimmed">Chargement des données...</Text>
          </Stack>
        )}

        {!loadingDetails && clientDetails && (
          <Stack gap="md" mt="md">
            {/* Infos Générales */}
            <Card withBorder p="md" radius="sm">
              <Text fw={700} size="sm" mb="xs" c="brand">Informations de contact</Text>
              <Stack gap="xs">
                <Group>
                  <IconPhone size={16} color="gray" />
                  <Text size="sm">Téléphone : <b>{clientDetails.phone || 'Non renseigné'}</b></Text>
                </Group>
                <Group>
                  <IconMail size={16} color="gray" />
                  <Text size="sm">E-mail : <b>{clientDetails.email}</b></Text>
                </Group>
                <Group>
                  <IconBriefcase size={16} color="gray" />
                  <Text size="sm">Entreprise : <b>{clientDetails.company || 'Aucune'}</b></Text>
                </Group>
                <Group>
                  <Text size="sm">Statut : 
                    <Badge color={clientDetails.status === 'ACTIF' ? 'green' : 'blue'} ml={5} size="xs">
                      {clientDetails.status}
                    </Badge>
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Tabs value={activeTab} onChange={setActiveTab} color="brand">
              <Tabs.List>
                <Tabs.Tab value="mandats" leftSection={<IconFolder size={16} />}>Dossiers & Mandats</Tabs.Tab>
                <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>Fil d&apos;activité</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="mandats" pt="xs">
                <Card withBorder p="md" radius="sm">
                  <Text fw={700} size="sm" mb="xs" c="brand">Dossiers et Mandats de l&apos;enquête</Text>
                  {clientDetails.mandats && clientDetails.mandats.length > 0 ? (
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Intitulé du mandat</Table.Th>
                          <Table.Th>Statut</Table.Th>
                          <Table.Th>Date de création</Table.Th>
                          <Table.Th style={{ width: '130px' }}>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {clientDetails.mandats.map((mandat: any) => (
                          <Table.Tr key={mandat.id}>
                            <Table.Td fw={500}>{mandat.title}</Table.Td>
                            <Table.Td>
                              <Badge size="xs" color={
                                mandat.status === 'OUVERT' || mandat.status === 'EN_COURS' ? 'blue' :
                                mandat.status === 'TERMINE' ? 'green' : 'gray'
                              }>
                                {mandat.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs">
                                {new Date(mandat.createdAt).toLocaleDateString('fr-FR')}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                color="brand"
                                leftSection={<IconMapPin size={14} />}
                                onClick={() => setSelectedMandateForMap(mandat)}
                              >
                                Carte
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">Aucun mandat associé à ce client.</Text>
                  )}
                </Card>
              </Tabs.Panel>

              <Tabs.Panel value="activity" pt="xs">
                <Card withBorder p="md" radius="sm">
                  <Text fw={700} size="sm" mb="xs" c="brand">Historique des interactions</Text>
                  {clientActivities.length > 0 ? (
                    <Stack gap="sm">
                      {clientActivities.map((activity) => (
                        <Card key={activity.id} withBorder shadow="sm" radius="md" p="sm">
                          <Group justify="space-between">
                            <Group gap="xs">
                              {activity.type === 'CALL' ? <IconPhoneCall size={20} color={GOLD} /> : <IconActivity size={20} color="gray" />}
                              <Text fw={600}>{activity.type === 'CALL' ? (activity.payload?.direction === 'INBOUND' ? 'Appel entrant' : 'Appel sortant') : activity.type}</Text>
                            </Group>
                            <Text size="xs" c="dimmed">{new Date(activity.createdAt).toLocaleString('fr-FR')}</Text>
                          </Group>
                          {activity.type === 'CALL' && (
                            <Box mt="xs">
                              <Text size="sm">
                                {activity.payload?.status === 'MISSED' ? <Badge color="red" size="sm">Manqué</Badge> : <Badge color="green" size="sm">Répondu ({activity.payload?.duration}s)</Badge>}
                                <span style={{ marginLeft: 10 }}>De: {activity.payload?.from} | À: {activity.payload?.to}</span>
                              </Text>
                              {activity.payload?.recordingFileId && (
                                <Box mt="sm">
                                  <Text size="xs" c="dimmed" mb={5}>Enregistrement audio :</Text>
                                  <audio 
                                    controls 
                                    src={`http://localhost:3000/api/v1/files/stream/${activity.payload.recordingFileId}?token=${token}`}
                                    style={{ width: '100%', height: '40px' }}
                                  />
                                </Box>
                              )}
                            </Box>
                          )}
                          {activity.type !== 'CALL' && (
                            <Text size="sm" mt="xs" c="dimmed">{JSON.stringify(activity.payload)}</Text>
                          )}
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic">Aucune activité enregistrée.</Text>
                  )}
                </Card>
              </Tabs.Panel>
            </Tabs>

            <Group justify="flex-end" mt="md">
              <Button onClick={() => setClientModalId(null)} color="gray">
                Fermer
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ========================================== */}
      {/* MODAL : CREATION RAPIDE CLIENT INCONNU    */}
      {/* ========================================== */}
      <Modal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={
          <Group gap="xs">
            <IconUserPlus color={GOLD} size={22} />
            <Text fw={700} size="lg">Création rapide de client (CTI)</Text>
          </Group>
        }
        radius="md"
        styles={{
          header: { borderBottom: `1px solid ${GOLD_BORDER}`, paddingBottom: '10px' },
          content: { border: `1px solid ${GOLD_BORDER}` }
        }}
      >
        <form onSubmit={handleCreateClient}>
          <Stack gap="md" mt="md">
            {createError && (
              <Alert title="Erreur" color="red">
                {createError}
              </Alert>
            )}

            <TextInput
              label="Numéro de Téléphone"
              value={incomingCall?.phone || ''}
              disabled
              styles={{ input: { fontFamily: 'monospace' } }}
            />

            <TextInput
              label="Prénom"
              placeholder="Ex: Jean"
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
              required
            />

            <TextInput
              label="Nom de famille"
              placeholder="Ex: Dupont"
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
              required
            />

            <TextInput
              label="E-mail"
              type="email"
              placeholder="Ex: jean.dupont@email.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              required
            />

            <TextInput
              label="Entreprise (Optionnel)"
              placeholder="Ex: Acme Inc."
              value={createCompany}
              onChange={(e) => setCreateCompany(e.target.value)}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setIsCreateModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" color="brand" style={{ backgroundColor: GOLD }} loading={createLoading}>
                Enregistrer le client
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ========================================== */}
      {/* MODAL : VISUALISATION DE LA CARTE DES PREUVES */}
      {/* ========================================== */}
      <Modal
        opened={!!selectedMandateForMap}
        onClose={() => setSelectedMandateForMap(null)}
        title={
          <Group gap="xs">
            <IconMapPin color={GOLD} size={22} />
            <Text fw={700} size="lg">Carte des Preuves - {selectedMandateForMap?.title}</Text>
          </Group>
        }
        size="lg"
        radius="md"
        styles={{
          header: { borderBottom: `1px solid ${GOLD_BORDER}`, paddingBottom: '10px' },
          content: { border: `1px solid ${GOLD_BORDER}` }
        }}
      >
        {selectedMandateForMap && (
          <MandateMap mandatId={selectedMandateForMap.id} token={token} />
        )}
      </Modal>
    </AppShell>
  );
}

interface MandateMapProps {
  mandatId: string;
  token: string | null;
}

function MandateMap({ mandatId, token }: MandateMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoFiles, setGeoFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/mandates/${mandatId}/geo-files`)
      .then(res => {
        setGeoFiles(res.data);
      })
      .catch(err => {
        console.error('Error fetching geo files:', err);
        setError('Impossible de récupérer les preuves géolocalisées');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mandatId]);

  useEffect(() => {
    if (loading || error || !mapContainerRef.current || geoFiles.length === 0) return;

    // S'assurer qu'il n'y a pas déjà une carte initialisée
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    // Coordonnées de départ : Suisse par défaut
    const map = L.map(mapContainerRef.current).setView([46.8182, 8.2275], 8);
    mapInstanceRef.current = map;

    // Dark layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    const markerGroup = L.featureGroup();

    geoFiles.forEach(file => {
      if (file.geoLat !== null && file.geoLng !== null) {
        const isImage = file.name.match(/\.(jpg|jpeg|png|heic|heif)$/i);
        const isVideo = file.name.match(/\.(mp4|mov|webm)$/i);
        // Base API URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
        const fileUrl = `${apiUrl}/files/stream/${file.id}?token=${token}`;

        let previewHtml = '';
        if (isImage) {
          previewHtml = `<img src="${fileUrl}" style="max-width: 100%; max-height: 120px; border-radius: 4px; margin-top: 8px; display: block; object-fit: cover;" />`;
        } else if (isVideo) {
          previewHtml = `<video src="${fileUrl}" controls style="max-width: 100%; max-height: 120px; border-radius: 4px; margin-top: 8px; display: block;"></video>`;
        }

        const popupContent = `
          <div style="font-family: sans-serif; color: #111; min-width: 180px; font-size: 12px; line-height: 1.4;">
            <strong style="display: block; font-size: 13px; margin-bottom: 4px; word-break: break-all;">${file.name}</strong>
            <span style="color: #666; font-size: 10px;">Date : ${new Date(file.createdAt).toLocaleString('fr-FR')}</span>
            ${previewHtml}
            <div style="margin-top: 6px; font-size: 10px; color: #888;">GPS : ${file.geoLat.toFixed(5)}, ${file.geoLng.toFixed(5)}</div>
          </div>
        `;

        const marker = L.marker([file.geoLat, file.geoLng])
          .bindPopup(popupContent);
        
        marker.addTo(map);
        markerGroup.addLayer(marker);
      }
    });

    if (markerGroup.getLayers().length > 0) {
      map.fitBounds(markerGroup.getBounds(), { padding: [40, 40] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, error, geoFiles, token]);

  if (loading) {
    return (
      <Stack align="center" justify="center" py="xl">
        <Loader color="brand" size="md" />
        <Text size="sm" c="dimmed">Chargement de la carte et des fichiers...</Text>
      </Stack>
    );
  }

  if (error) {
    return <Alert color="red">{error}</Alert>;
  }

  if (geoFiles.length === 0) {
    return (
      <Alert color="blue" title="Aucune preuve géolocalisée">
        Ce mandat ne contient aucun fichier photo ou vidéo avec des coordonnées GPS valides.
      </Alert>
    );
  }

  return (
    <Box style={{ border: `1px solid ${GOLD_BORDER}`, borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ height: '450px', width: '100%' }} />
    </Box>
  );
}
