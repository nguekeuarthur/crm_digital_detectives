import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Text,
  Button,
  Group,
  Badge,
  Card,
  Stack,
  ThemeIcon,
  Divider,
  Alert,
  Loader
} from '@mantine/core';
import { IconBrandStripe, IconCheck, IconAlertCircle, IconReceipt } from '@tabler/icons-react';
import { PaymentButton } from '../../../../features/billing/ui/PaymentButton';
import { useSearchParams } from 'react-router-dom';
import { BillingApi } from '../../../../shared/api/billing';

export function StripeSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Skeleton state: Not connected
  const [isConnected, setIsConnected] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [simulationInvoiceId, setSimulationInvoiceId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const invoiceId = searchParams.get('invoice_id');

    if (payment === 'success' && invoiceId) {
      setSimulationInvoiceId(invoiceId);
      setSimulationStatus('loading');
      
      // Simuler le webhook localement
      BillingApi.simulateStripeWebhook(invoiceId)
        .then(() => {
          setSimulationStatus('success');
          // Nettoyer les paramètres de recherche
          setSearchParams({});
        })
        .catch((err: any) => {
          console.error(err);
          setSimulationStatus('error');
          setSimulationError(err.response?.data?.error?.message || err.message);
          setSearchParams({});
        });
    } else if (payment === 'cancel') {
      setSimulationStatus('error');
      setSimulationError('Le paiement a été annulé par l\'utilisateur.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const GOLD = '#AB8E3D';
  const GOLD_BORDER = 'rgba(171, 142, 61, 0.35)';

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2} style={{ color: GOLD }}>
          Intégration Stripe Connect
        </Title>
      </Group>

      <Paper shadow="sm" p="xl" radius="md" withBorder style={{ borderColor: GOLD_BORDER }}>
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            Gérez votre connexion avec Stripe pour permettre les paiements en ligne et la facturation automatique de vos clients et sous-traitants.
          </Text>

          <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#1a1a1a', borderColor: GOLD_BORDER }}>
            <Group justify="space-between" align="center">
              <Group>
                <ThemeIcon size={60} radius="md" color="indigo" variant="light">
                  <IconBrandStripe size={40} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="lg" c="white">Compte Stripe</Text>
                  <Group gap="xs" mt={4}>
                    <Badge color={isConnected ? 'green' : 'yellow'} variant="light">
                      {isConnected ? 'Connecté' : 'En attente de configuration'}
                    </Badge>
                  </Group>
                </div>
              </Group>
              
              <Button 
                color="indigo" 
                variant={isConnected ? "light" : "filled"}
                size="md"
                onClick={() => setIsConnected(!isConnected)} // Pour la demo
                disabled={false} // Ce sera géré plus tard quand on aura les vraies IDs
              >
                {isConnected ? 'Gérer le compte' : 'Connecter avec Stripe'}
              </Button>
            </Group>

            <Divider my="xl" color="dark.4" />

            {isConnected ? (
              <Stack gap="md">
                <Group>
                  <ThemeIcon color="green" size={24} radius="xl">
                    <IconCheck size={14} />
                  </ThemeIcon>
                  <Text size="sm" c="white">Paiements par carte de crédit activés</Text>
                </Group>
                <Group>
                  <ThemeIcon color="green" size={24} radius="xl">
                    <IconCheck size={14} />
                  </ThemeIcon>
                  <Text size="sm" c="white">Virements automatiques configurés</Text>
                </Group>
              </Stack>
            ) : (
              <Group>
                <ThemeIcon color="yellow" size={24} radius="xl">
                  <IconAlertCircle size={14} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  La connexion à Stripe est requise pour utiliser toutes les fonctionnalités de facturation. (Les identifiants clients seront configurés prochainement)
                </Text>
              </Group>
            )}
          </Card>

          {/* Alerte de simulation de paiement */}
          {simulationStatus === 'loading' && (
            <Alert icon={<Loader size="sm" />} title="Simulation du Webhook Stripe" color="blue" variant="light">
              Paiement réussi ! Envoi de la notification webhook simulée au backend pour finalisation de la facture...
            </Alert>
          )}

          {simulationStatus === 'success' && (
            <Alert icon={<IconCheck size={16} />} title="Paiement validé" color="green" variant="light" withCloseButton onClose={() => setSimulationStatus('idle')}>
              Le webhook a été traité avec succès ! La facture ({simulationInvoiceId}) a été marquée comme <strong>PAYÉE</strong> dans la base de données et le reçu de facturation PDF a été généré.
            </Alert>
          )}

          {simulationStatus === 'error' && (
            <Alert icon={<IconAlertCircle size={16} />} title="Erreur de paiement / simulation" color="red" variant="light" withCloseButton onClose={() => setSimulationStatus('idle')}>
              {simulationError || 'Une erreur est survenue lors de la simulation du paiement.'}
            </Alert>
          )}

          {/* Simulateur de paiement pour démo */}
          <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#1a1a1a', borderColor: GOLD_BORDER }}>
            <Group justify="space-between" align="center">
              <Group>
                <ThemeIcon size={40} radius="md" color="blue" variant="light">
                  <IconReceipt size={24} />
                </ThemeIcon>
                <div>
                  <Text fw={700} size="md" c="white">Simulateur de Facturation (Démo)</Text>
                  <Text size="sm" c="dimmed">Testez la génération de lien de paiement</Text>
                </div>
              </Group>
              <PaymentButton invoiceId="TEST_INVOICE_ID" disabled={!isConnected} />
            </Group>
          </Card>

          {/* Explication du flux client */}
          <Card withBorder radius="md" p="xl" style={{ backgroundColor: '#111', borderColor: GOLD_BORDER }}>
            <Text fw={700} size="md" c="white" mb="md">📋 Flux de paiement client</Text>
            <Stack gap="sm">
              <Group gap="xs">
                <Badge circle color="indigo" size="lg">1</Badge>
                <Text size="sm" c="dimmed">L'admin crée un <strong style={{ color: '#fff' }}>devis accepté</strong> pour un client depuis le CRM → une facture est générée.</Text>
              </Group>
              <Group gap="xs">
                <Badge circle color="indigo" size="lg">2</Badge>
                <Text size="sm" c="dimmed">L'admin clique <strong style={{ color: '#fff' }}>« Envoyer le lien de paiement »</strong> → le client reçoit un email avec un bouton <em>Payer maintenant</em>.</Text>
              </Group>
              <Group gap="xs">
                <Badge circle color="indigo" size="lg">3</Badge>
                <Text size="sm" c="dimmed">Le client clique sur le lien → il est redirigé vers la <strong style={{ color: '#fff' }}>page sécurisée Stripe</strong> pour payer par carte.</Text>
              </Group>
              <Group gap="xs">
                <Badge circle color="green" size="lg">4</Badge>
                <Text size="sm" c="dimmed">Stripe envoie un <strong style={{ color: '#fff' }}>webhook automatique</strong> au CRM → la facture est marquée <strong style={{ color: '#4ade80' }}>PAYÉE</strong>.</Text>
              </Group>
              <Group gap="xs">
                <Badge circle color="green" size="lg">5</Badge>
                <Text size="sm" c="dimmed">Le client reçoit automatiquement un email avec la <strong style={{ color: '#4ade80' }}>facture acquittée PDF</strong> en pièce jointe.</Text>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Paper>
    </Container>
  );
}
