import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card, Stack, Badge, Table,
  Tabs, Loader, Center, Alert, Modal, Radio, Progress, ThemeIcon, Tooltip,
  Textarea, Divider, ActionIcon, Input,
} from '@mantine/core';
import {
  IconBuildingBank, IconRefresh, IconUpload, IconLock, IconCheck, IconAlertCircle,
  IconLink, IconLinkOff, IconEyeOff, IconSearch, IconReceipt, IconTargetArrow,
  IconPlugConnected,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  BankingApi, BankAccount, BankTransaction, BankTxStatus, BankingStats,
  MatchCandidate, MATCH_METHOD_LABELS,
} from '../../../shared/api/banking';
import { BLINK_STATE_STORAGE_KEY } from './BankConnectCallbackPage';

const GOLD = '#AB8E3D';

const softCardStyle = {
  border: '1.5px solid #cbd2d9',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
};

const STATUS_CONFIG: Record<BankTxStatus, { label: string; color: string }> = {
  UNMATCHED: { label: 'À vérifier', color: 'orange' },
  SUGGESTED: { label: 'Suggestion', color: 'blue' },
  MATCHED: { label: 'Rapprochée', color: 'green' },
  IGNORED: { label: 'Écartée', color: 'gray' },
};

const formatCHF = (amount: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 2 }).format(amount);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const scoreColor = (score: number) => (score >= 0.9 ? 'green' : score >= 0.7 ? 'yellow' : 'orange');

/** Libellé du payeur : nom du donneur d'ordre, à défaut la communication */
function payerLabel(transaction: BankTransaction) {
  return transaction.debtorName || transaction.remittanceInfo || 'Donneur d\'ordre inconnu';
}

function invoiceLabel(transaction: BankTransaction) {
  const invoice = transaction.matchedInvoice;
  if (!invoice) return '—';
  const reference = invoice.quote?.reference ?? `FAC-${invoice.id.slice(0, 8).toUpperCase()}`;
  const client = invoice.mandat?.client;
  const clientName = client ? client.company || `${client.firstName} ${client.lastName}` : '';
  return clientName ? `${reference} — ${clientName}` : reference;
}

export function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [stats, setStats] = useState<BankingStats | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [tab, setTab] = useState<'review' | 'matched' | 'ignored'>('review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [matchTarget, setMatchTarget] = useState<BankTransaction | null>(null);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [ignoreTarget, setIgnoreTarget] = useState<BankTransaction | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');

  const [connecting, setConnecting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statuses: BankTxStatus[] =
        tab === 'review' ? ['UNMATCHED', 'SUGGESTED'] : tab === 'matched' ? ['MATCHED'] : ['IGNORED'];

      const [accountList, statsPayload, ...pages] = await Promise.all([
        BankingApi.listAccounts(),
        BankingApi.getStats(),
        ...statuses.map((status) => BankingApi.listTransactions({ status, search: search || undefined, limit: 50 })),
      ]);

      setAccounts(accountList);
      setStats(statsPayload);
      setTransactions(
        pages
          .flatMap((page) => page.items)
          .sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()),
      );
    } catch {
      setError('Impossible de charger les données bancaires.');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Démarre le consentement bancaire : le titulaire du compte valide l'accès en
   * lecture directement chez UBS, qui nous renvoie ensuite sur /banque/callback.
   */
  const handleConnectBank = async () => {
    setConnecting(true);
    try {
      const { url, state } = await BankingApi.getAuthorizationUrl();
      // Anti-rejeu : vérifié au retour de la banque
      sessionStorage.setItem(BLINK_STATE_STORAGE_KEY, state);
      window.location.href = url;
    } catch (err) {
      notifications.show({
        title: 'Connexion bancaire indisponible',
        message: (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          ?? "Le connecteur bLink n'est pas configuré sur ce serveur.",
        color: 'orange',
      });
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await BankingApi.sync();
      notifications.show({
        title: 'Synchronisation terminée',
        message: `${result.imported} écriture(s) importée(s), ${result.reconciliation.auto} rapprochement(s) automatique(s).`,
        color: 'teal',
      });
      if (result.errors.length) {
        notifications.show({ title: 'Comptes en erreur', message: result.errors.join(' | '), color: 'orange' });
      }
      await loadData();
    } catch (err) {
      notifications.show({
        title: 'Synchronisation impossible',
        message: (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          ?? 'Vérifiez la configuration du connecteur bancaire.',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCamtUpload = async (file: File) => {
    setSyncing(true);
    try {
      const result = await BankingApi.importCamt(file);
      notifications.show({
        title: 'Relevé importé',
        message: `${result.imported} nouvelle(s) écriture(s) sur ${result.received} lue(s).`,
        color: 'teal',
      });
      await loadData();
    } catch {
      notifications.show({ title: 'Import impossible', message: 'Le fichier camt.053 n\'a pas pu être lu.', color: 'red' });
    } finally {
      setSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openMatchModal = async (transaction: BankTransaction) => {
    setMatchTarget(transaction);
    setSelectedInvoice(transaction.suggestions?.[0]?.invoiceId ?? null);
    setCandidatesLoading(true);
    try {
      const list = await BankingApi.getCandidates(transaction.id);
      setCandidates(list);
      setSelectedInvoice((current) => current ?? list[0]?.invoiceId ?? null);
    } catch {
      setCandidates(transaction.suggestions ?? []);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const confirmMatch = async () => {
    if (!matchTarget || !selectedInvoice) return;
    setSubmitting(true);
    try {
      await BankingApi.match(matchTarget.id, selectedInvoice);
      notifications.show({
        title: 'Écriture rapprochée',
        message: 'La facture a été soldée et le reçu envoyé au client.',
        color: 'teal',
      });
      setMatchTarget(null);
      await loadData();
    } catch (err) {
      notifications.show({
        title: 'Rapprochement impossible',
        message: (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
          ?? 'Une erreur est survenue.',
        color: 'red',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmIgnore = async () => {
    if (!ignoreTarget) return;
    setSubmitting(true);
    try {
      await BankingApi.ignore(ignoreTarget.id, ignoreReason);
      notifications.show({ title: 'Écriture écartée', message: 'Elle ne sera plus proposée au rapprochement.', color: 'gray' });
      setIgnoreTarget(null);
      setIgnoreReason('');
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnmatch = async (transaction: BankTransaction) => {
    try {
      await BankingApi.unmatch(transaction.id);
      notifications.show({
        title: 'Rapprochement annulé',
        message: 'La facture est repassée en attente de paiement.',
        color: 'orange',
      });
      await loadData();
    } catch {
      notifications.show({ title: 'Erreur', message: 'Annulation impossible.', color: 'red' });
    }
  };

  const referencedRate = stats ? Math.round(stats.referencedAutoMatchRate * 100) : 0;
  const targetReached = referencedRate >= 70;

  return (
    <Box>
      {/* ─── En-tête ─────────────────────────────────────────────────────── */}
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box>
          <Group gap="sm">
            <Title order={2}>Rapprochement bancaire</Title>
            <Tooltip label="Le CRM consulte les écritures ; aucun ordre n'est jamais transmis à la banque.">
              <Badge color="gray" variant="light" leftSection={<IconLock size={12} />}>
                Lecture seule
              </Badge>
            </Tooltip>
          </Group>
          <Text c="dimmed" size="sm" mt={4}>
            Les virements reçus sur le compte UBS sont importés chaque nuit et rapprochés des factures en attente.
          </Text>
        </Box>

        <Group>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.camt"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) handleCamtUpload(file);
            }}
          />
          <Button
            variant="light"
            color="gray"
            leftSection={<IconUpload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={syncing}
          >
            Importer un camt.053
          </Button>
          <Button
            variant="light"
            color="teal"
            leftSection={<IconPlugConnected size={16} />}
            onClick={handleConnectBank}
            loading={connecting}
          >
            Connecter UBS
          </Button>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleSync}
            loading={syncing}
            style={{ backgroundColor: GOLD }}
          >
            Synchroniser
          </Button>
        </Group>
      </Group>

      {/* ─── Indicateurs ─────────────────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="lg">
        <Card padding="lg" radius="lg" style={softCardStyle}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>Écritures au crédit</Text>
            <ThemeIcon radius="xl" size={42} variant="light" color="gray"><IconBuildingBank size={20} /></ThemeIcon>
          </Group>
          <Title order={3}>{stats?.total ?? 0}</Title>
          <Text size="xs" c="dimmed" mt={4}>{stats?.accounts ?? 0} compte(s) suivi(s)</Text>
        </Card>

        <Card padding="lg" radius="lg" style={softCardStyle}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>Rapprochées automatiquement</Text>
            <ThemeIcon radius="xl" size={42} variant="light" color="teal"><IconCheck size={20} /></ThemeIcon>
          </Group>
          <Title order={3}>{stats?.autoMatched ?? 0}</Title>
          <Text size="xs" c="teal" mt={4}>
            {stats ? Math.round(stats.autoMatchRate * 100) : 0} % des encaissements
          </Text>
        </Card>

        <Card padding="lg" radius="lg" style={softCardStyle}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>En vérification manuelle</Text>
            <ThemeIcon radius="xl" size={42} variant="light" color="orange"><IconAlertCircle size={20} /></ThemeIcon>
          </Group>
          <Title order={3}>{stats?.pendingReview ?? 0}</Title>
          <Text size="xs" c="dimmed" mt={4}>{stats?.suggested ?? 0} avec suggestion</Text>
        </Card>

        <Card padding="lg" radius="lg" style={softCardStyle}>
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed" fw={500}>Taux sur paiements référencés</Text>
            <ThemeIcon radius="xl" size={42} variant="light" color={targetReached ? 'teal' : 'orange'}>
              <IconTargetArrow size={20} />
            </ThemeIcon>
          </Group>
          <Title order={3}>{referencedRate} %</Title>
          <Progress value={referencedRate} color={targetReached ? 'teal' : 'orange'} size="sm" mt={8} />
          <Text size="xs" c={targetReached ? 'teal' : 'dimmed'} mt={4}>
            Objectif ≥ 70 % · {stats?.referencedCredits ?? 0} paiement(s) référencé(s)
          </Text>
        </Card>
      </SimpleGrid>

      {/* ─── Comptes suivis ──────────────────────────────────────────────── */}
      {accounts.length > 0 && (
        <Card padding="md" radius="lg" style={softCardStyle} mb="lg">
          <Group gap="xl">
            {accounts.map((account) => (
              <Group key={account.id} gap="sm">
                <ThemeIcon radius="md" size={38} variant="light" color="gray">
                  <IconBuildingBank size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="sm">{account.label}</Text>
                  <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{account.iban}</Text>
                  <Text size="xs" c="dimmed">
                    {account.lastSyncAt
                      ? `Dernière synchro : ${new Date(account.lastSyncAt).toLocaleString('fr-CH')} — ${account.lastSyncStatus ?? ''}`
                      : 'Jamais synchronisé'}
                  </Text>
                </Box>
                <Badge variant="light" color={account.provider === 'UBS_BLINK' ? 'teal' : 'gray'} size="sm">
                  {account.provider === 'UBS_BLINK' ? 'UBS · bLink' : account.provider === 'CAMT_FILE' ? 'camt.053' : 'Démo'}
                </Badge>
              </Group>
            ))}
          </Group>
        </Card>
      )}

      {/* ─── File d'attente ──────────────────────────────────────────────── */}
      <Card padding="lg" radius="lg" style={softCardStyle}>
        <Group justify="space-between" mb="md">
          <Tabs value={tab} onChange={(value) => setTab((value as typeof tab) ?? 'review')}>
            <Tabs.List>
              <Tabs.Tab value="review" leftSection={<IconAlertCircle size={16} />}>
                À vérifier {stats ? `(${stats.pendingReview})` : ''}
              </Tabs.Tab>
              <Tabs.Tab value="matched" leftSection={<IconCheck size={16} />}>
                Rapprochées {stats ? `(${stats.matched})` : ''}
              </Tabs.Tab>
              <Tabs.Tab value="ignored" leftSection={<IconEyeOff size={16} />}>
                Écartées {stats ? `(${stats.ignored})` : ''}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <Input
            placeholder="Rechercher un payeur, une référence…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            w={280}
          />
        </Group>

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md">
            {error}
          </Alert>
        )}

        {loading ? (
          <Center py="xl"><Loader color="yellow" /></Center>
        ) : transactions.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <ThemeIcon size={48} radius="xl" variant="light" color="gray"><IconReceipt size={24} /></ThemeIcon>
              <Text c="dimmed" size="sm">
                {tab === 'review' ? 'Aucune écriture en attente de vérification.' : 'Aucune écriture dans cette catégorie.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Donneur d&apos;ordre</Table.Th>
                <Table.Th>Communication / Référence</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Montant</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th style={{ width: 210 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transactions.map((transaction) => {
                const topSuggestion = transaction.suggestions?.[0];
                return (
                  <Table.Tr key={transaction.id}>
                    <Table.Td>
                      <Text size="sm">{formatDate(transaction.bookingDate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{payerLabel(transaction)}</Text>
                      {transaction.debtorIban && (
                        <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>{transaction.debtorIban}</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {transaction.structuredRef ? (
                        <Badge variant="light" color="teal" size="sm" style={{ fontFamily: 'monospace' }}>
                          {transaction.structuredRef}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed" lineClamp={1}>{transaction.remittanceInfo || '—'}</Text>
                      )}
                      {transaction.status === 'MATCHED' && (
                        <Text size="xs" c="dimmed" mt={2}>{invoiceLabel(transaction)}</Text>
                      )}
                      {transaction.status !== 'MATCHED' && topSuggestion && (
                        <Text size="xs" c="blue" mt={2}>
                          Suggestion : {topSuggestion.invoiceLabel} ({Math.round(topSuggestion.score * 100)} %)
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={600} size="sm" c={transaction.creditDebit === 'CRDT' ? 'teal' : 'red'}>
                        {transaction.creditDebit === 'CRDT' ? '+' : '−'}{formatCHF(transaction.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" size="sm" color={STATUS_CONFIG[transaction.status].color}>
                        {STATUS_CONFIG[transaction.status].label}
                      </Badge>
                      {transaction.status === 'MATCHED' && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {transaction.matchedById ? 'Validée manuellement' : 'Automatique'}
                          {transaction.matchMethod ? ` · ${MATCH_METHOD_LABELS[transaction.matchMethod]}` : ''}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {transaction.status === 'MATCHED' ? (
                        <Button
                          size="xs"
                          variant="subtle"
                          color="orange"
                          leftSection={<IconLinkOff size={14} />}
                          onClick={() => handleUnmatch(transaction)}
                        >
                          Annuler
                        </Button>
                      ) : transaction.status === 'IGNORED' ? (
                        <Text size="xs" c="dimmed">{transaction.ignoredReason || 'Écartée'}</Text>
                      ) : (
                        <Group gap="xs">
                          <Button
                            size="xs"
                            variant="light"
                            color="teal"
                            leftSection={<IconLink size={14} />}
                            onClick={() => openMatchModal(transaction)}
                          >
                            Rapprocher
                          </Button>
                          <Tooltip label="Écarter (frais bancaires, virement interne…)">
                            <ActionIcon variant="subtle" color="gray" onClick={() => setIgnoreTarget(transaction)}>
                              <IconEyeOff size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* ─── Modal de rapprochement manuel ───────────────────────────────── */}
      <Modal
        opened={!!matchTarget}
        onClose={() => setMatchTarget(null)}
        title={<Text fw={700}>Rapprocher l&apos;écriture</Text>}
        size="lg"
        radius="md"
      >
        {matchTarget && (
          <Stack gap="md">
            <Card withBorder padding="sm" radius="md">
              <Group justify="space-between">
                <Box>
                  <Text fw={600}>{payerLabel(matchTarget)}</Text>
                  <Text size="xs" c="dimmed">
                    {formatDate(matchTarget.bookingDate)} · {matchTarget.remittanceInfo || 'Sans communication'}
                  </Text>
                  {matchTarget.structuredRef && (
                    <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      Réf. {matchTarget.structuredRef}
                    </Text>
                  )}
                </Box>
                <Text fw={700} size="lg" c="teal">{formatCHF(matchTarget.amount)}</Text>
              </Group>
            </Card>

            <Divider label="Factures candidates" labelPosition="center" />

            {candidatesLoading ? (
              <Center py="md"><Loader size="sm" color="yellow" /></Center>
            ) : candidates.length === 0 ? (
              <Alert color="orange" icon={<IconAlertCircle size={16} />}>
                Aucune facture en attente ne correspond à ce virement. Vérifiez qu&apos;une facture existe et
                qu&apos;elle n&apos;est pas déjà payée.
              </Alert>
            ) : (
              <Radio.Group value={selectedInvoice} onChange={setSelectedInvoice}>
                <Stack gap="sm">
                  {candidates.map((candidate) => (
                    <Card key={candidate.invoiceId} withBorder padding="sm" radius="md">
                      <Radio
                        value={candidate.invoiceId}
                        label={
                          <Box>
                            <Group gap="xs">
                              <Text fw={600} size="sm">{candidate.invoiceLabel}</Text>
                              <Text size="sm" c="dimmed">— {candidate.clientName}</Text>
                              <Badge size="sm" variant="light" color={scoreColor(candidate.score)}>
                                {Math.round(candidate.score * 100)} %
                              </Badge>
                              <Badge size="sm" variant="outline" color="gray">
                                {MATCH_METHOD_LABELS[candidate.method]}
                              </Badge>
                            </Group>
                            <Text size="xs" c="dimmed" mt={4}>
                              Montant facturé : {formatCHF(candidate.invoiceAmount)}
                            </Text>
                            <Stack gap={2} mt={4}>
                              {candidate.reasons.map((reason) => (
                                <Text key={reason} size="xs" c="dimmed">• {reason}</Text>
                              ))}
                            </Stack>
                          </Box>
                        }
                      />
                    </Card>
                  ))}
                </Stack>
              </Radio.Group>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setMatchTarget(null)}>Annuler</Button>
              <Button
                color="teal"
                leftSection={<IconCheck size={16} />}
                disabled={!selectedInvoice}
                loading={submitting}
                onClick={confirmMatch}
              >
                Solder la facture
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ─── Modal d'écartement ──────────────────────────────────────────── */}
      <Modal
        opened={!!ignoreTarget}
        onClose={() => setIgnoreTarget(null)}
        title={<Text fw={700}>Écarter l&apos;écriture</Text>}
        radius="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            L&apos;écriture restera consultable mais ne sera plus proposée au rapprochement.
          </Text>
          <Textarea
            label="Motif"
            placeholder="Ex : frais bancaires, virement interne, remboursement fournisseur"
            value={ignoreReason}
            onChange={(event) => setIgnoreReason(event.currentTarget.value)}
            autosize
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setIgnoreTarget(null)}>Annuler</Button>
            <Button color="gray" loading={submitting} onClick={confirmIgnore}>Écarter</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
