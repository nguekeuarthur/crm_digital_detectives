import { useCallback, useEffect, useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card, Stack, Badge, Table,
  Loader, Center, Alert, Modal, Select, Textarea, Tooltip, ActionIcon, Input,
  ThemeIcon, Divider,
} from '@mantine/core';
import {
  IconSignature, IconRefresh, IconSend, IconDownload, IconBan, IconSearch,
  IconAlertCircle, IconCheck, IconClock, IconFlask, IconShieldLock, IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  SignatureApi, ContractSuivi, ContractStatus, SignatureStats, SignatureQuality,
  STATUT_CONTRAT, QUALITE_LABELS,
} from '../../../shared/api/signature';
import { FileApi } from '../../../shared/api/file';

const GOLD = '#AB8E3D';

const softCardStyle = {
  border: '1.5px solid #cbd2d9',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
};

const formatDate = (valeur?: string | null) =>
  valeur
    ? new Date(valeur).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

const formatDateHeure = (valeur?: string | null) =>
  valeur
    ? new Date(valeur).toLocaleString('fr-CH', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

/** Nom du client tel qu'on l'affiche dans la liste */
function nomClient(contrat: ContractSuivi) {
  const client = contrat.mandat.client;
  return client.company || `${client.firstName} ${client.lastName}`;
}

/**
 * Depuis combien de temps le contrat attend-il ? Une demande qui traîne est le
 * premier signal d'un client à relancer.
 */
function joursEnAttente(contrat: ContractSuivi): number | null {
  if (contrat.status !== 'SENT' || !contrat.sentForSignatureAt) return null;
  const ecart = Date.now() - new Date(contrat.sentForSignatureAt).getTime();
  return Math.floor(ecart / 86_400_000);
}

const ONGLETS: Array<{ cle: ContractStatus | 'TOUS'; label: string }> = [
  { cle: 'TOUS', label: 'Tous' },
  { cle: 'DRAFT', label: 'À envoyer' },
  { cle: 'SENT', label: 'En attente' },
  { cle: 'SIGNED', label: 'Signés' },
  { cle: 'DECLINED', label: 'Refusés' },
];

export function ContractSignaturePage() {
  const [contrats, setContrats] = useState<ContractSuivi[]>([]);
  const [stats, setStats] = useState<SignatureStats | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<ContractStatus | 'TOUS'>('TOUS');
  const [recherche, setRecherche] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);

  // Modale d'envoi
  const [aEnvoyer, setAEnvoyer] = useState<ContractSuivi | null>(null);
  const [qualite, setQualite] = useState<SignatureQuality | null>(null);
  const [message, setMessage] = useState('');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [liste, statistiques] = await Promise.all([
        SignatureApi.listerContrats({
          statut: filtre === 'TOUS' ? undefined : filtre,
          recherche: recherche.trim() || undefined,
          limite: 50,
        }),
        SignatureApi.statistiques(),
      ]);
      setContrats(liste.items);
      setStats(statistiques);
    } catch (e) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErreur(err?.response?.data?.error?.message || err?.message || 'Chargement impossible');
    } finally {
      setChargement(false);
    }
  }, [filtre, recherche]);

  useEffect(() => {
    charger();
  }, [charger]);

  const signaler = (e: unknown, repli: string) => {
    const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
    notifications.show({
      color: 'red',
      title: 'Échec',
      message: err?.response?.data?.error?.message || err?.message || repli,
    });
  };

  const envoyer = async () => {
    if (!aEnvoyer) return;
    setEnCours(aEnvoyer.id);
    try {
      await SignatureApi.envoyerPourSignature(aEnvoyer.id, {
        qualite: qualite ?? undefined,
        message: message.trim() || undefined,
      });
      notifications.show({
        color: 'green',
        title: 'Contrat envoyé',
        message: `${aEnvoyer.mandat.client.email} a reçu une invitation à signer.`,
      });
      setAEnvoyer(null);
      setMessage('');
      setQualite(null);
      await charger();
    } catch (e) {
      signaler(e, "L'envoi a échoué");
    } finally {
      setEnCours(null);
    }
  };

  const annuler = async (contrat: ContractSuivi) => {
    setEnCours(contrat.id);
    try {
      await SignatureApi.annuler(contrat.id);
      notifications.show({ color: 'orange', title: 'Demande annulée', message: 'Le contrat peut être renvoyé.' });
      await charger();
    } catch (e) {
      signaler(e, "L'annulation a échoué");
    } finally {
      setEnCours(null);
    }
  };

  const simuler = async (contrat: ContractSuivi, issue: 'signe' | 'refuse') => {
    setEnCours(contrat.id);
    try {
      await SignatureApi.simuler(contrat.id, issue);
      notifications.show({
        color: issue === 'signe' ? 'green' : 'orange',
        title: 'Simulation',
        message: issue === 'signe' ? 'Signature simulée et document archivé.' : 'Refus simulé.',
      });
      await charger();
    } catch (e) {
      signaler(e, 'La simulation a échoué');
    } finally {
      setEnCours(null);
    }
  };

  const telecharger = async (contrat: ContractSuivi) => {
    const fichier = contrat.signedFile ?? contrat.file;
    try {
      const url = await FileApi.getBlobUrl(fichier.id);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      signaler(e, 'Téléchargement impossible');
    }
  };

  const enSimulation = stats?.connecteur === 'MOCK';

  return (
    <Box p="md">
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box>
          <Group gap="xs">
            <ThemeIcon size="lg" radius="md" variant="light" color="yellow">
              <IconSignature size={20} />
            </ThemeIcon>
            <Title order={2}>Signature des contrats</Title>
          </Group>
          <Text c="dimmed" size="sm" mt={4}>
            Envoi des contrats au client, suivi des signatures et archivage des documents signés.
          </Text>
        </Box>
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={charger}
          loading={chargement}
        >
          Actualiser
        </Button>
      </Group>

      {enSimulation && (
        <Alert
          icon={<IconFlask size={18} />}
          color="orange"
          mb="md"
          title="Connecteur en simulation"
        >
          Aucune demande n’est transmise à un prestataire et les documents produits{' '}
          <strong>n’ont aucune valeur juridique</strong>. Pour signer réellement, placez{' '}
          <code>SIGNATURE_PROVIDER=SKRIBBLE</code> dans la configuration de l’API.
        </Alert>
      )}

      {erreur && (
        <Alert icon={<IconAlertCircle size={18} />} color="red" mb="md" title="Erreur">
          {erreur}
        </Alert>
      )}

      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} mb="lg">
          <Tuile libelle="À envoyer" valeur={stats.brouillon} couleur="gray" icone={<IconSend size={18} />} />
          <Tuile libelle="En attente" valeur={stats.enAttente} couleur="blue" icone={<IconClock size={18} />} />
          <Tuile libelle="Signés" valeur={stats.signes} couleur="green" icone={<IconCheck size={18} />} />
          <Tuile libelle="Refusés" valeur={stats.refuses} couleur="red" icone={<IconX size={18} />} />
          <Tuile libelle="Annulés" valeur={stats.annules} couleur="orange" icone={<IconBan size={18} />} />
          <Tuile libelle="En erreur" valeur={stats.enErreur} couleur="red" icone={<IconAlertCircle size={18} />} />
        </SimpleGrid>
      )}

      {stats && (
        <Group gap="xs" mb="md" wrap="nowrap" align="flex-start">
          <ThemeIcon size="sm" radius="xl" variant="light" color="gray" mt={2}>
            <IconShieldLock size={12} />
          </ThemeIcon>
          <Text size="sm" c="dimmed">
            Niveau demandé par défaut : <strong>{QUALITE_LABELS[stats.qualite].court}</strong> —{' '}
            {QUALITE_LABELS[stats.qualite].long}. Minimum accepté :{' '}
            <strong>{QUALITE_LABELS[stats.qualiteMinimale].court}</strong>.
          </Text>
        </Group>
      )}

      <Card radius="md" withBorder style={softCardStyle} mb="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Group gap="xs">
            {ONGLETS.map((onglet) => (
              <Button
                key={onglet.cle}
                size="xs"
                variant={filtre === onglet.cle ? 'filled' : 'light'}
                color={filtre === onglet.cle ? 'yellow' : 'gray'}
                onClick={() => setFiltre(onglet.cle)}
              >
                {onglet.label}
              </Button>
            ))}
          </Group>
          <Input
            placeholder="Client, mandat ou adresse…"
            leftSection={<IconSearch size={14} />}
            value={recherche}
            onChange={(e) => setRecherche(e.currentTarget.value)}
            w={280}
          />
        </Group>
      </Card>

      <Card radius="md" withBorder style={softCardStyle} p={0}>
        {chargement ? (
          <Center py="xl">
            <Loader color={GOLD} />
          </Center>
        ) : contrats.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap={4}>
              <Text c="dimmed">Aucun contrat pour ce filtre.</Text>
              <Text c="dimmed" size="sm">
                Les contrats apparaissent ici dès qu’ils sont générés depuis un mandat.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Mandat</Table.Th>
                  <Table.Th>État</Table.Th>
                  <Table.Th>Suivi</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {contrats.map((contrat) => {
                  const config = STATUT_CONTRAT[contrat.status];
                  const attente = joursEnAttente(contrat);
                  const occupe = enCours === contrat.id;

                  return (
                    <Table.Tr key={contrat.id}>
                      <Table.Td>
                        <Text fw={600} size="sm">{nomClient(contrat)}</Text>
                        <Text size="xs" c="dimmed">
                          {contrat.signerEmail || contrat.mandat.client.email}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Text size="sm">{contrat.mandat.title}</Text>
                        <Text size="xs" c="dimmed">{contrat.template?.name || contrat.file.name}</Text>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={6} wrap="wrap">
                          <Tooltip label={config.detail} withArrow>
                            <Badge color={config.couleur} variant="light">{config.label}</Badge>
                          </Tooltip>
                          {contrat.signatureQuality && (
                            <Tooltip label={QUALITE_LABELS[contrat.signatureQuality].long} withArrow>
                              <Badge variant="outline" color="gray" size="sm">
                                {QUALITE_LABELS[contrat.signatureQuality].court}
                              </Badge>
                            </Tooltip>
                          )}
                          {contrat.signatureProvider === 'MOCK' && (
                            <Badge color="orange" variant="light" size="xs">simulation</Badge>
                          )}
                        </Group>
                        {attente !== null && attente >= 7 && (
                          <Text size="xs" c="orange" mt={4}>
                            en attente depuis {attente} jours
                          </Text>
                        )}
                        {contrat.status === 'ERROR' && contrat.lastError && (
                          <Tooltip label={contrat.lastError} multiline w={320} withArrow>
                            <Text size="xs" c="red" mt={4} lineClamp={1}>
                              {contrat.lastError}
                            </Text>
                          </Tooltip>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Tooltip
                          label={
                            `Généré le ${formatDate(contrat.generatedAt)}` +
                            (contrat.sentForSignatureAt ? ` · envoyé le ${formatDate(contrat.sentForSignatureAt)}` : '') +
                            (contrat.signedAt ? ` · signé le ${formatDateHeure(contrat.signedAt)}` : '')
                          }
                          withArrow
                        >
                          {contrat.signedAt ? (
                            <Text size="xs" c="green">Signé {formatDate(contrat.signedAt)}</Text>
                          ) : contrat.sentForSignatureAt ? (
                            <Text size="xs" c="dimmed">Envoyé {formatDate(contrat.sentForSignatureAt)}</Text>
                          ) : (
                            <Text size="xs" c="dimmed">Généré {formatDate(contrat.generatedAt)}</Text>
                          )}
                        </Tooltip>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={6} justify="flex-end" wrap="nowrap">
                          {(contrat.status === 'DRAFT' ||
                            contrat.status === 'DECLINED' ||
                            contrat.status === 'WITHDRAWN' ||
                            contrat.status === 'ERROR') && (
                            <Button
                              size="xs"
                              leftSection={<IconSend size={14} />}
                              loading={occupe}
                              onClick={() => {
                                setAEnvoyer(contrat);
                                setQualite(stats?.qualite ?? null);
                              }}
                            >
                              Envoyer
                            </Button>
                          )}

                          {contrat.status === 'SENT' && (
                            <>
                              {enSimulation && (
                                <>
                                  <Tooltip label="Simuler la signature du client" withArrow>
                                    <ActionIcon
                                      variant="light"
                                      color="green"
                                      loading={occupe}
                                      onClick={() => simuler(contrat, 'signe')}
                                    >
                                      <IconCheck size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Simuler un refus" withArrow>
                                    <ActionIcon
                                      variant="light"
                                      color="red"
                                      loading={occupe}
                                      onClick={() => simuler(contrat, 'refuse')}
                                    >
                                      <IconX size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                </>
                              )}
                              <Tooltip label="Annuler la demande" withArrow>
                                <ActionIcon
                                  variant="light"
                                  color="orange"
                                  loading={occupe}
                                  onClick={() => annuler(contrat)}
                                >
                                  <IconBan size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}

                          <Tooltip
                            label={contrat.signedFile ? 'Ouvrir le document signé' : 'Ouvrir le contrat'}
                            withArrow
                          >
                            <ActionIcon
                              variant="light"
                              color={contrat.signedFile ? 'green' : 'gray'}
                              onClick={() => telecharger(contrat)}
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {/* ── Envoi ─────────────────────────────────────────────────────────── */}
      <Modal
        opened={aEnvoyer !== null}
        onClose={() => setAEnvoyer(null)}
        title="Envoyer le contrat à la signature"
        size="lg"
      >
        {aEnvoyer && (
          <Stack gap="md">
            <Card withBorder radius="md" p="sm">
              <Text size="sm" fw={600}>{nomClient(aEnvoyer)}</Text>
              <Text size="xs" c="dimmed">{aEnvoyer.mandat.client.email}</Text>
              <Divider my="xs" />
              <Text size="sm">{aEnvoyer.mandat.title}</Text>
              <Text size="xs" c="dimmed">{aEnvoyer.file.name}</Text>
            </Card>

            <Select
              label="Niveau de signature"
              description={
                stats
                  ? `L’agence exige au minimum : ${QUALITE_LABELS[stats.qualiteMinimale].court}.`
                  : undefined
              }
              value={qualite}
              onChange={(v) => setQualite(v as SignatureQuality)}
              data={(['QES', 'AES', 'SES'] as SignatureQuality[]).map((q) => ({
                value: q,
                label: `${QUALITE_LABELS[q].court} — ${QUALITE_LABELS[q].long}`,
              }))}
            />

            {qualite === 'QES' && (
              <Alert color="blue" variant="light">
                La signature qualifiée impose au client une <strong>identification préalable</strong>{' '}
                (appel vidéo ou identité électronique) avant de pouvoir signer. C’est ce qui lui donne
                la valeur d’une signature manuscrite.
              </Alert>
            )}

            <Textarea
              label="Message au client"
              description="Laisser vide pour le message par défaut."
              minRows={3}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
            />

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setAEnvoyer(null)}>Annuler</Button>
              <Button
                leftSection={<IconSend size={16} />}
                loading={enCours === aEnvoyer.id}
                onClick={envoyer}
              >
                Envoyer au client
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}

function Tuile({
  libelle, valeur, couleur, icone,
}: {
  libelle: string;
  valeur: number;
  couleur: string;
  icone: React.ReactNode;
}) {
  return (
    <Card radius="md" withBorder style={softCardStyle}>
      <Group justify="space-between" align="flex-start">
        <Box>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{libelle}</Text>
          <Text fw={700} size="xl" mt={2}>{valeur}</Text>
        </Box>
        <ThemeIcon size="lg" radius="md" variant="light" color={couleur}>
          {icone}
        </ThemeIcon>
      </Group>
    </Card>
  );
}
