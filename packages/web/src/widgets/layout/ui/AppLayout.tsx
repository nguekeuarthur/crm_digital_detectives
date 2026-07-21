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
  Tabs,
  Grid,
  SimpleGrid,
  ThemeIcon,
  NavLink,
  Notification,
  Select
} from '@mantine/core';
import { 
  IconPhoneCall, 
  IconUserPlus, 
  IconEye, 
  IconX, 
  IconBriefcase, 
  IconMail, 
  IconPhone, 
  IconActivity, 
  IconFolder, 
  IconMapPin,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCheck,
  IconDashboard,
  IconUsers,
  IconCalendar,
  IconUserCheck,
  IconLogout,
  IconCamera,
  IconBrandStripe,
  IconFileDescription,
  IconAlertCircle,
  IconPlus,
  IconSettings,
  IconFileText,
  IconFolders,
  IconChartBar,
  IconFileInvoice,
  IconMap,
  IconCash
} from '@tabler/icons-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../shared/api/base';
import { getAccessToken } from '../../../shared/api/token';
import { notifications } from '@mantine/notifications';
import { showLoadingNotif, completeNotif, failNotif } from '../../../shared/lib/successNotification';
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
  { label: 'Modèles de Mandats', icon: IconFileText, href: '/settings/contracts' },
  { label: 'Paramètres E-mail', icon: IconMail, href: '/settings/emails' },
  { label: 'Paramètres Stripe', icon: IconBrandStripe, href: '/settings/stripe' },
  { label: 'Sécurité (2FA)', icon: IconSettings, href: '/settings/2fa' },
];

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

interface NikonNotificationData {
  fileId: string;
  fileName: string;
  mandateId: string;
  mandateTitle: string;
  geoLat: number | null;
  geoLng: number | null;
}

interface GeoFile {
  id: string;
  name: string;
  size: number;
  geoLat: number;
  geoLng: number;
  folderId: string;
  exifData: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string | null;
  createdAt: string;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // États CTI
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // États Nikon Cloud notifications
  const [nikonNotification, setNikonNotification] = useState<NikonNotificationData | null>(null);

  const handleOpenImportedFile = async (mandateId: string, fileId: string) => {
    try {
      setLoadingGeoFiles(true);
      const res = await api.get(`/mandates/${mandateId}/geo-files`);
      const files = res.data as GeoFile[];
      setGeoFiles(files);
      const targetFile = files.find(f => f.id === fileId);
      if (targetFile) {
        setSelectedFileForViewer(targetFile);
      }
    } catch (err) {
      console.error('Failed to open imported file:', err);
    } finally {
      setLoadingGeoFiles(false);
    }
  };
  
  // États Modal de consultation client
  // États Modal de consultation client sous forme de paramètres de recherche URL
  const [searchParams, setSearchParams] = useSearchParams();
  const clientModalId = searchParams.get('clientId');
  const setClientModalId = (id: string | null) => {
    setSearchParams(params => {
      if (id) {
        params.set('clientId', id);
      } else {
        params.delete('clientId');
      }
      return params;
    });
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientDetails, setClientDetails] = useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientActivities, setClientActivities] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('mandats');

  // États Facturation & Devis
  const [clientQuotes, setClientQuotes] = useState<any[]>([]);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);

  // Manual payment states
  const [manualPaymentInvoiceId, setManualPaymentInvoiceId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankReference, setBankReference] = useState<string>('');
  const [newQuoteMandatId, setNewQuoteMandatId] = useState<string>('');
  const [newQuoteLabel, setNewQuoteLabel] = useState<string>('Prestation d\'enquête standard');
  const [newQuotePrice, setNewQuotePrice] = useState<number>(1500);
  const [creatingQuote, setCreatingQuote] = useState(false);

  const handleCreateQuote = async () => {
    if (!clientModalId || !newQuoteMandatId || !newQuoteLabel || !newQuotePrice) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs',
        color: 'red'
      });
      return;
    }
    setCreatingQuote(true);
    const nid = showLoadingNotif('Création', 'Création du devis en cours...');
    try {
      await api.post('/quotes', {
        clientId: clientModalId,
        mandatId: newQuoteMandatId,
        taxRate: 7.7,
        items: [
          {
            label: newQuoteLabel,
            quantity: 1,
            unitPrice: Number(newQuotePrice),
            discount: 0
          }
        ]
      });
      completeNotif(nid, 'Succès', 'Devis créé avec succès en statut brouillon');
      // Rafraîchir les devis
      const quotesRes = await api.get(`/quotes?clientId=${clientModalId}`);
      setClientQuotes(quotesRes.data || []);
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Impossible de créer le devis. ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setCreatingQuote(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    const nid = showLoadingNotif('E-mail', 'Génération du PDF et envoi de l\'e-mail...');
    try {
      await api.post(`/quotes/${quoteId}/send`);
      completeNotif(nid, 'Succès', 'Le devis PDF a été envoyé au client par e-mail !');
      // Rafraîchir
      if (clientModalId) {
        const quotesRes = await api.get(`/quotes?clientId=${clientModalId}`);
        setClientQuotes(quotesRes.data || []);
      }
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Impossible d\'envoyer le devis. ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    const nid = showLoadingNotif('Validation', 'Validation du devis en cours...');
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status: 'ACCEPTED' });
      completeNotif(nid, 'Succès', 'Devis accepté ! Une facture PENDING a été générée automatiquement.');
      // Rafraîchir
      if (clientModalId) {
        const [quotesRes, invoicesRes] = await Promise.all([
          api.get(`/quotes?clientId=${clientModalId}`),
          api.get(`/billing/invoices?clientId=${clientModalId}`)
        ]);
        setClientQuotes(quotesRes.data || []);
        setClientInvoices(invoicesRes.data || []);
      }
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Impossible de valider le devis. ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleSendInvoiceLink = async (invoiceId: string) => {
    const nid = showLoadingNotif('Envoi en cours', 'Génération de la session Stripe et envoi de l\'e-mail...');
    try {
      await api.post(`/billing/invoices/${invoiceId}/send-to-client`);
      completeNotif(nid, 'Succès', 'Lien de paiement Stripe envoyé au client par e-mail !');
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Impossible d\'envoyer le lien de paiement. ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleSimulateInvoicePayment = async (invoiceId: string) => {
    const nid = showLoadingNotif('Simulation', 'Simulation du paiement Stripe et déclenchement du webhook...');
    try {
      await api.post(
        `/webhooks/stripe`,
        {
          type: 'checkout.session.completed',
          data: {
            object: {
              client_reference_id: invoiceId
            }
          }
        },
        {
          headers: {
            'x-mock-webhook': 'true'
          }
        }
      );
      completeNotif(nid, 'Paiement Confirmé !', 'Paiement Stripe reçu. Facture payée et reçu PDF envoyé par e-mail.');
      // Rafraîchir
      if (clientModalId) {
        const invoicesRes = await api.get(`/billing/invoices?clientId=${clientModalId}`);
        setClientInvoices(invoicesRes.data || []);
      }
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Erreur de simulation : ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleManualPayment = async () => {
    if (!manualPaymentInvoiceId || !paymentDate || !bankReference) return;
    const nid = showLoadingNotif('Paiement manuel', 'Enregistrement en cours...');
    try {
      await api.patch(`/billing/invoices/${manualPaymentInvoiceId}/pay-manual`, {
        paymentDate: new Date(paymentDate).toISOString(),
        bankReference
      });
      completeNotif(nid, 'Succès', 'Facture marquée comme payée !');
      setManualPaymentInvoiceId(null);
      setBankReference('');
      if (clientModalId) {
        const invoicesRes = await api.get(`/billing/invoices?clientId=${clientModalId}`);
        setClientInvoices(invoicesRes.data || []);
      }
    } catch (err: any) {
      console.error(err);
      failNotif(nid, 'Erreur', 'Impossible d\'enregistrer le paiement manuel. ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleViewInvoicePDF = (invoiceId: string) => {
    const token = getAccessToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.open(`${apiUrl}/billing/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  const handleViewQuotePDF = (quoteId: string) => {
    const token = getAccessToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    window.open(`${apiUrl}/quotes/${quoteId}/pdf?token=${token}`, '_blank');
  };

  // États Modal de visualisation de carte des preuves
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMandateForMap, setSelectedMandateForMap] = useState<any | null>(null);
  const [geoFiles, setGeoFiles] = useState<GeoFile[]>([]);
  const [loadingGeoFiles, setLoadingGeoFiles] = useState(false);
  const [errorGeoFiles, setErrorGeoFiles] = useState<string | null>(null);
  const [selectedFileForViewer, setSelectedFileForViewer] = useState<GeoFile | null>(null);

  useEffect(() => {
    if (!selectedMandateForMap) {
      setGeoFiles([]);
      return;
    }
    setLoadingGeoFiles(true);
    setErrorGeoFiles(null);
    api.get(`/mandates/${selectedMandateForMap.id}/geo-files`)
      .then(res => {
        setGeoFiles(res.data);
      })
      .catch(err => {
        console.error('Error fetching geo files:', err);
        setErrorGeoFiles('Impossible de récupérer les preuves géolocalisées');
      })
      .finally(() => {
        setLoadingGeoFiles(false);
      });
  }, [selectedMandateForMap]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).openEvidenceViewer = (fileId: string) => {
      const fileObj = geoFiles.find(f => f.id === fileId);
      if (fileObj) {
        setSelectedFileForViewer(fileObj);
      }
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).openEvidenceViewer;
    };
  }, [geoFiles]);

  // États Modal de création rapide client
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createCompany, setCreateCompany] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Helper pour formater l'URL WebSocket
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
          else if (message.type === 'NIKON_FILE_IMPORTED') {
            setNikonNotification(message.data);
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
      setClientQuotes([]);
      setClientInvoices([]);
      return;
    }

    setLoadingDetails(true);
    Promise.all([
      api.get(`/clients/${clientModalId}`).then(res => res.data).catch(err => {
        console.error('Erreur chargement client details:', err);
        return null;
      }),
      api.get(`/clients/${clientModalId}/activity`).then(res => res.data).catch(err => {
        console.error('Erreur chargement client activity:', err);
        return [];
      }),
      api.get(`/quotes?clientId=${clientModalId}`).then(res => res.data).catch(err => {
        console.error('Erreur chargement client quotes:', err);
        return [];
      }),
      api.get(`/billing/invoices?clientId=${clientModalId}`).then(res => res.data).catch(err => {
        console.error('Erreur chargement client invoices:', err);
        return [];
      })
    ])
      .then(([details, activities, quotes, invoices]) => {
        setClientDetails(details);
        setClientActivities(activities || []);
        setClientQuotes(quotes || []);
        setClientInvoices(invoices || []);
        
        // Choisir par défaut le premier mandat pour le formulaire
        const clientMandats = details?.mandats || [];
        if (clientMandats.length > 0) {
          setNewQuoteMandatId(clientMandats[0].id);
        } else {
          setNewQuoteMandatId('');
        }
      })
      .catch((err) => {
        console.error('❌ [CTI] Erreur inattendue lors du chargement des détails :', err);
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
      layout="alt"
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
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

      <AppShell.Navbar p="md" style={{ background: '#121212', borderRight: `1px solid ${GOLD_BORDER}` }}>
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <Group justify="center" mb="xl">
            <ThemeIcon
              size="lg"
              radius="md"
              variant="filled"
              style={{ backgroundColor: GOLD }}
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
                  leftSection={<item.icon size={16} color={isActive ? GOLD : '#999'} />}
                  component={Link}
                  to={item.href}
                  active={isActive}
                  style={{
                    color: isActive ? GOLD : '#999',
                    backgroundColor: isActive ? 'rgba(171, 142, 61, 0.12)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${GOLD}` : 'none',
                    fontWeight: isActive ? 600 : 400,
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

      {/* ========================================== */}
      {/* TOAST D'IMPORT AUTOMATIQUE NIKON CLOUD   */}
      {/* ========================================== */}
      {nikonNotification && (
        <Box
          style={{
            position: 'fixed',
            bottom: incomingCall ? 250 : 24, // S'empile si un appel est déjà affiché
            right: 24,
            width: 340,
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
        >
          <Notification
            onClose={() => setNikonNotification(null)}
            icon={<IconCamera size={18} />}
            title={
              <Text fw={700} size="sm" style={{ color: GOLD }}>
                IMPORT AUTOMATIQUE NIKON
              </Text>
            }
            withCloseButton
            styles={{
              root: {
                backgroundColor: DARK_BG,
                borderColor: GOLD_BORDER,
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 10px 30px ${GOLD_GLOW}`,
                backdropFilter: 'blur(10px)',
                padding: '12px',
              },
              title: {
                color: GOLD,
              },
              description: {
                color: '#ddd',
              },
              closeButton: {
                color: '#aaa',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }
              }
            }}
          >
            <Stack gap="xs" mt="xs">
              <Text size="xs" style={{ color: '#ccc' }}>
                Une nouvelle photo a été synchronisée depuis le cloud Nikon :
              </Text>
              <Box>
                <Text size="xs" fw={700} style={{ color: '#fff', wordBreak: 'break-all' }}>
                  {nikonNotification.fileName}
                </Text>
                <Text size="xs" style={{ color: '#aaa', marginTop: '2px' }}>
                  Mandat : <b>{nikonNotification.mandateTitle}</b>
                </Text>
                {nikonNotification.geoLat !== null && nikonNotification.geoLng !== null && (
                  <Text size="xs" style={{ color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
                    GPS : {nikonNotification.geoLat.toFixed(5)}, {nikonNotification.geoLng.toFixed(5)}
                  </Text>
                )}
              </Box>
              <Button
                size="xs"
                variant="filled"
                color="brand"
                style={{ backgroundColor: GOLD }}
                onClick={() => {
                  handleOpenImportedFile(nikonNotification.mandateId, nikonNotification.fileId);
                  setNikonNotification(null);
                }}
                fullWidth
              >
                Voir la preuve
              </Button>
            </Stack>
          </Notification>
        </Box>
      )}

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
                <Tabs.Tab value="billing" leftSection={<IconBrandStripe size={16} />}>Facturation & Devis</Tabs.Tab>
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

              <Tabs.Panel value="billing" pt="md">
                <Stack gap="lg">
                  {/* Résumé financier du client */}
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Card withBorder shadow="sm" radius="md" p="md">
                      <Group justify="space-between">
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Total Facturé</Text>
                          <Text fw={700} size="xl" mt={4}>
                            {clientInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0).toFixed(2)} CHF
                          </Text>
                        </Box>
                        <ThemeIcon size="lg" radius="md" variant="light" color="gray">
                          <IconBrandStripe size={20} />
                        </ThemeIcon>
                      </Group>
                    </Card>

                    <Card withBorder shadow="sm" radius="md" p="md">
                      <Group justify="space-between">
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Devis en attente</Text>
                          <Text fw={700} size="xl" mt={4}>
                            {clientQuotes.filter((q: any) => q.status === 'SENT').length}
                          </Text>
                        </Box>
                        <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                          <IconFileDescription size={20} />
                        </ThemeIcon>
                      </Group>
                    </Card>

                    <Card withBorder shadow="sm" radius="md" p="md">
                      <Group justify="space-between">
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Factures Impayées</Text>
                          <Text fw={700} size="xl" c={clientInvoices.some((i: any) => i.status === 'PENDING') ? 'red' : 'green'} mt={4}>
                            {clientInvoices.filter((i: any) => i.status === 'PENDING').length}
                          </Text>
                        </Box>
                        <ThemeIcon size="lg" radius="md" variant="light" color={clientInvoices.some((i: any) => i.status === 'PENDING') ? 'red' : 'green'}>
                          <IconAlertCircle size={20} />
                        </ThemeIcon>
                      </Group>
                    </Card>
                  </SimpleGrid>

                  {/* Créer un Devis Rapide */}
                  <Card withBorder shadow="sm" radius="md" p="md">
                    <Group mb="md" gap="xs">
                      <IconPlus size={20} color={GOLD} />
                      <Text fw={700} size="md">Nouveau devis</Text>
                    </Group>
                    
                    {clientDetails?.mandats && clientDetails.mandats.length > 0 ? (
                      <Stack gap="md">
                        <Grid>
                          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                            <Select
                              label="Mandat associé"
                              placeholder="Choisir le mandat"
                              data={clientDetails.mandats.map((m: any) => ({ value: m.id, label: m.title }))}
                              value={newQuoteMandatId}
                              onChange={(val: string | null) => setNewQuoteMandatId(val || '')}
                            />
                          </Grid.Col>
                          <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
                            <TextInput
                              label="Libellé de la prestation"
                              placeholder="Ex: Surveillance mobile et filature"
                              value={newQuoteLabel}
                              onChange={(e) => setNewQuoteLabel(e.currentTarget.value)}
                            />
                          </Grid.Col>
                          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                            <TextInput
                              label="Tarif HT (CHF)"
                              type="number"
                              value={newQuotePrice}
                              onChange={(e) => setNewQuotePrice(Number(e.currentTarget.value))}
                            />
                          </Grid.Col>
                        </Grid>
                        <Group justify="flex-end">
                          <Button
                            onClick={handleCreateQuote}
                            loading={creatingQuote}
                            color="brand"
                          >
                            Créer le devis
                          </Button>
                        </Group>
                      </Stack>
                    ) : (
                      <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
                        Vous devez d'abord créer un mandat pour ce client avant de pouvoir lui faire un devis.
                      </Alert>
                    )}
                  </Card>

                  {/* Liste des Devis */}
                  <Card withBorder shadow="sm" radius="md" p="md">
                    <Group mb="md" gap="xs">
                      <IconFileDescription size={20} color={GOLD} />
                      <Text fw={700} size="md">Devis (Quotes)</Text>
                    </Group>

                    {clientQuotes && clientQuotes.length > 0 ? (
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Référence</Table.Th>
                            <Table.Th>Mandat</Table.Th>
                            <Table.Th>Montant TTC</Table.Th>
                            <Table.Th>Statut</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {clientQuotes.map((quote: any) => (
                            <Table.Tr key={quote.id}>
                              <Table.Td fw={500}>{quote.reference}</Table.Td>
                              <Table.Td>
                                <Text size="sm" lineClamp={1}>{quote.mandat?.title || 'N/A'}</Text>
                              </Table.Td>
                              <Table.Td>{quote.totalTTC.toFixed(2)} CHF</Table.Td>
                              <Table.Td>
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color={
                                    quote.status === 'ACCEPTED' ? 'green' :
                                    quote.status === 'SENT' ? 'blue' :
                                    quote.status === 'REFUSED' ? 'red' : 'gray'
                                  }
                                >
                                  {quote.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => handleViewQuotePDF(quote.id)}
                                  >
                                    PDF
                                  </Button>
                                  {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="blue"
                                        leftSection={<IconMail size={14} />}
                                        onClick={() => handleSendQuote(quote.id)}
                                      >
                                        {quote.status === 'DRAFT' ? 'Envoyer' : 'Renvoyer'}
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="filled"
                                        color="green"
                                        leftSection={<IconCheck size={14} />}
                                        onClick={() => handleAcceptQuote(quote.id)}
                                      >
                                        Générer Facture (Client OK)
                                      </Button>
                                    </>
                                  )}
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">Aucun devis créé pour ce client.</Text>
                    )}
                  </Card>

                  {/* Liste des Factures */}
                  <Card withBorder shadow="sm" radius="md" p="md">
                    <Group mb="md" gap="xs">
                      <IconBrandStripe size={20} color={GOLD} />
                      <Text fw={700} size="md">Factures clients (Stripe)</Text>
                    </Group>

                    {clientInvoices && clientInvoices.length > 0 ? (
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>N° Facture</Table.Th>
                            <Table.Th>Mandat</Table.Th>
                            <Table.Th>Montant TTC</Table.Th>
                            <Table.Th>Échéance</Table.Th>
                            <Table.Th>Statut</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {clientInvoices.map((invoice: any) => (
                            <Table.Tr key={invoice.id}>
                              <Table.Td fw={500}>FAC-{invoice.id.substring(0, 8).toUpperCase()}</Table.Td>
                              <Table.Td>
                                <Text size="sm" lineClamp={1}>{invoice.mandat?.title || 'N/A'}</Text>
                              </Table.Td>
                              <Table.Td>{invoice.amount.toFixed(2)} CHF</Table.Td>
                              <Table.Td>
                                {invoice.dueDate ? (
                                  <Text
                                    size="sm"
                                    c={new Date(invoice.dueDate) < new Date() && invoice.status === 'PENDING' ? 'red' : 'dimmed'}
                                    fw={new Date(invoice.dueDate) < new Date() && invoice.status === 'PENDING' ? 600 : 400}
                                  >
                                    {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                                  </Text>
                                ) : '-'}
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color={invoice.status === 'PAID' ? 'green' : 'yellow'}
                                >
                                  {invoice.status === 'PAID' ? 'PAYÉE' : 'EN ATTENTE'}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  {invoice.status === 'PENDING' && (
                                    <>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="indigo"
                                        leftSection={<IconMail size={14} />}
                                        onClick={() => handleSendInvoiceLink(invoice.id)}
                                      >
                                        Envoyer Lien
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="teal"
                                        leftSection={<IconCheck size={14} />}
                                        onClick={() => handleSimulateInvoicePayment(invoice.id)}
                                      >
                                        Payer (Démo)
                                      </Button>
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="orange"
                                        leftSection={<IconCash size={14} />}
                                        onClick={() => setManualPaymentInvoiceId(invoice.id)}
                                      >
                                        Saisie Manuelle
                                      </Button>
                                    </>
                                  )}
                                  {invoice.status === 'PAID' && (
                                    <Button
                                      size="xs"
                                      variant="light"
                                      color="green"
                                      leftSection={<IconFileDescription size={14} />}
                                      onClick={() => handleViewInvoicePDF(invoice.id)}
                                    >
                                      Reçu PDF
                                    </Button>
                                  )}
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">Aucune facture générée pour ce client.</Text>
                    )}
                  </Card>
                </Stack>
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
      {/* MODAL : PAIEMENT MANUEL                   */}
      {/* ========================================== */}
      <Modal
        opened={!!manualPaymentInvoiceId}
        onClose={() => setManualPaymentInvoiceId(null)}
        title="Saisir un paiement manuel"
        size="md"
        radius="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Utilisez ce formulaire pour marquer une facture comme payée suite à la réception d'un virement, d'un chèque ou d'un paiement en espèces.
          </Text>
          <TextInput
            type="date"
            label="Date de réception du paiement"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
          <TextInput
            label="Référence bancaire"
            placeholder="Ex: VIR-123456"
            value={bankReference}
            onChange={(e) => setBankReference(e.currentTarget.value)}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="light" color="gray" onClick={() => setManualPaymentInvoiceId(null)}>
              Annuler
            </Button>
            <Button color="green" onClick={handleManualPayment} disabled={!paymentDate || !bankReference}>
              Enregistrer le paiement
            </Button>
          </Group>
        </Stack>
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
          <MandateMap 
            token={token} 
            geoFiles={geoFiles}
            loading={loadingGeoFiles}
            error={errorGeoFiles}
          />
        )}
      </Modal>

      {/* ========================================== */}
      {/* MODAL : VISIONNEUSE DE PREUVE INDIVIDUELLE */}
      {/* ========================================== */}
      <Modal
        opened={!!selectedFileForViewer}
        onClose={() => setSelectedFileForViewer(null)}
        title={
          <Group gap="xs">
            <IconEye color={GOLD} size={22} />
            <Text fw={700} size="lg">Visionneuse de Preuve</Text>
          </Group>
        }
        size="xl"
        radius="md"
        styles={{
          header: { borderBottom: `1px solid ${GOLD_BORDER}`, paddingBottom: '10px' },
          content: { border: `1px solid ${GOLD_BORDER}` }
        }}
      >
        {selectedFileForViewer && (
          <EvidenceViewerContent
            file={selectedFileForViewer}
            geoFiles={geoFiles}
            token={token}
            onSelectFile={setSelectedFileForViewer}
          />
        )}
      </Modal>
    </AppShell>
  );
}

interface MandateMapProps {
  token: string | null;
  geoFiles: GeoFile[];
  loading: boolean;
  error: string | null;
}

function MandateMap({ token, geoFiles, loading, error }: MandateMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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
        const isImage = file.name.match(/\.(jpg|jpeg|png|heic|heif|gif|webp)$/i);
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
            <button onclick="window.openEvidenceViewer('${file.id}')" style="margin-top: 8px; width: 100%; padding: 6px; background-color: #AB8E3D; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; text-align: center;">Ouvrir la visionneuse</button>
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

interface EvidenceMiniMapProps {
  lat: number;
  lng: number;
}

function EvidenceMiniMap({ lat, lng }: EvidenceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(map);

      const marker = L.marker([lat, lng]).addTo(map);
      
      mapRef.current = map;
      markerRef.current = marker;
    } else {
      mapRef.current.setView([lat, lng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);
  }, [lat, lng]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  return (
    <Box style={{ height: '180px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${GOLD_BORDER}`, position: 'relative' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </Box>
  );
}

interface EvidenceViewerContentProps {
  file: GeoFile;
  geoFiles: GeoFile[];
  token: string | null;
  onSelectFile: (file: GeoFile) => void;
}

function EvidenceViewerContent({ file, geoFiles, token, onSelectFile }: EvidenceViewerContentProps) {
  const [copied, setCopied] = useState(false);

  const folderFiles = geoFiles.filter(f => f.folderId === file.folderId);
  const currentIndex = folderFiles.findIndex(f => f.id === file.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < folderFiles.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectFile(folderFiles[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectFile(folderFiles[currentIndex + 1]);
    }
  };

  const isImage = file.name.match(/\.(jpg|jpeg|png|heic|heif|gif|webp)$/i);
  const isVideo = file.name.match(/\.(mp4|mov|webm)$/i);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const fileUrl = `${apiUrl}/files/stream/${file.id}?token=${token}`;

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || 'INCONNU';
  };

  const formatExifText = () => {
    const exif = file.exifData || {};
    const lat = file.geoLat;
    const lng = file.geoLng;
    const dateStr = exif.DateTimeOriginal 
      ? new Date(exif.DateTimeOriginal).toLocaleString('fr-FR')
      : new Date(file.createdAt).toLocaleString('fr-FR');
    const make = exif.Make || exif.make || 'Inconnu';
    const model = exif.Model || exif.model || 'Inconnu';
    const software = exif.Software || exif.software || 'Inconnu';
    
    return `--- MÉTADONNÉES DE LA PREUVE ---
Fichier : ${file.name}
Date/Heure : ${dateStr}
Constructeur : ${make}
Modèle : ${model}
Logiciel : ${software}
Source d'importation : ${file.userId ? 'Import Manuel' : 'Nikon Cloud'}
Coordonnées GPS : ${lat ? lat.toFixed(6) : 'N/A'}, ${lng ? lng.toFixed(6) : 'N/A'}
---------------------------------`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatExifText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exif = file.exifData || {};
  const make = exif.Make || exif.make || 'Inconnu';
  const model = exif.Model || exif.model || 'Inconnu';
  const software = exif.Software || exif.software || 'Inconnu';
  const dateStr = exif.DateTimeOriginal 
    ? new Date(exif.DateTimeOriginal).toLocaleString('fr-FR')
    : new Date(file.createdAt).toLocaleString('fr-FR');
  const lat = file.geoLat;
  const lng = file.geoLng;
  const isManual = !!file.userId;

  return (
    <Grid gap="md" mt="xs">
      {/* Colonne gauche (70% - Visionneuse Média) */}
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Box style={{ 
          position: 'relative', 
          height: '480px', 
          backgroundColor: '#0a0a0a', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          overflow: 'hidden', 
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        }}>
          {/* Flèche gauche */}
          <ActionIcon 
            variant="filled" 
            color="dark" 
            onClick={handlePrev} 
            disabled={!hasPrev}
            style={{ 
              position: 'absolute', 
              left: 16, 
              zIndex: 10, 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              borderRadius: '50%', 
              width: 44, 
              height: 44,
              border: '1px solid rgba(255,255,255,0.1)',
              opacity: hasPrev ? 1 : 0.3,
              cursor: hasPrev ? 'pointer' : 'not-allowed'
            }}
          >
            <IconChevronLeft size={24} color="#fff" />
          </ActionIcon>

          {/* Média */}
          {isImage ? (
            <img src={fileUrl} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt={file.name} />
          ) : isVideo ? (
            <video src={fileUrl} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <Text c="dimmed">Format de fichier non pris en charge.</Text>
          )}

          {/* Flèche droite */}
          <ActionIcon 
            variant="filled" 
            color="dark" 
            onClick={handleNext} 
            disabled={!hasNext}
            style={{ 
              position: 'absolute', 
              right: 16, 
              zIndex: 10, 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              borderRadius: '50%', 
              width: 44, 
              height: 44,
              border: '1px solid rgba(255,255,255,0.1)',
              opacity: hasNext ? 1 : 0.3,
              cursor: hasNext ? 'pointer' : 'not-allowed'
            }}
          >
            <IconChevronRight size={24} color="#fff" />
          </ActionIcon>
        </Box>
      </Grid.Col>

      {/* Colonne droite (30% - Barre latérale d'infos) */}
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap="md">
          {/* En-tête : Nom, taille, extension */}
          <Box>
            <Text fw={700} size="md" style={{ wordBreak: 'break-all', color: '#1e293b' }} mb="xs">
              {file.name}
            </Text>
            <Group gap="xs">
              <Badge color="brand" variant="outline" style={{ borderColor: GOLD_BORDER, color: GOLD }}>
                {getFileExtension(file.name)}
              </Badge>
              <Text size="xs" style={{ color: '#475569' }}>
                {formatFileSize(file.size)}
              </Text>
            </Group>
          </Box>

          {/* Indicateur de Source */}
          <Group justify="space-between" align="center">
            <Text size="xs" style={{ color: '#475569' }} fw={500}>Source :</Text>
            <Badge color={isManual ? 'blue' : 'teal'} variant="filled" size="md">
              {isManual ? 'Import Manuel' : 'Nikon Cloud'}
            </Badge>
          </Group>

          {/* Mini-carte Leaflet */}
          {lat !== null && lng !== null ? (
            <Box>
              <Text size="xs" style={{ color: '#475569' }} fw={500} mb="xs">Localisation GPS de la prise :</Text>
              <EvidenceMiniMap lat={lat} lng={lng} />
            </Box>
          ) : (
            <Alert color="yellow">
              Aucune coordonnée GPS disponible.
            </Alert>
          )}

          {/* Détails EXIF */}
          <Box>
            <Text size="xs" style={{ color: '#000000' }} fw={600} mb="xs">Métadonnées EXIF :</Text>
            <Card withBorder style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }} p="xs" radius="sm">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs" style={{ color: '#000000' }}>Date/Heure :</Text>
                  <Text size="xs" fw={500} style={{ color: '#000000' }}>{dateStr}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" style={{ color: '#000000' }}>Appareil :</Text>
                  <Text size="xs" fw={500} style={{ color: '#000000' }}>{make}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" style={{ color: '#000000' }}>Modèle :</Text>
                  <Text size="xs" fw={500} style={{ color: '#000000' }}>{model}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" style={{ color: '#000000' }}>Logiciel :</Text>
                  <Text size="xs" fw={500} style={{ color: '#000000' }}>{software}</Text>
                </Group>
                {lat !== null && lng !== null && (
                  <Group justify="space-between">
                    <Text size="xs" style={{ color: '#000000' }}>Position :</Text>
                    <Text size="xs" fw={500} style={{ fontFamily: 'monospace', color: '#000000' }}>
                      {lat.toFixed(6)}, {lng.toFixed(6)}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Card>
          </Box>

          {/* Bouton Copier */}
          <Button 
            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            color={copied ? 'teal' : 'brand'} 
            style={{ backgroundColor: copied ? undefined : GOLD }} 
            onClick={handleCopy}
            fullWidth
            mt="xs"
          >
            {copied ? 'Copié dans le presse-papiers' : 'Copier les métadonnées'}
          </Button>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
