import React, { useState } from 'react';
import { Button, Tooltip } from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import { BillingApi } from '../../../shared/api/billing';

interface PaymentButtonProps {
  invoiceId: string;
  disabled?: boolean;
}

export function PaymentButton({ invoiceId, disabled = false }: PaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    try {
      setLoading(true);
      const { url } = await BillingApi.createPaymentLink(invoiceId);
      // Rediriger vers Stripe
      window.location.href = url;
    } catch (error) {
      console.error('Erreur lors de la génération du lien de paiement', error);
      // Optionnel: Afficher une notification
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip label="Générer un lien de paiement via Stripe">
      <Button
        leftSection={<IconCreditCard size={16} />}
        color="indigo"
        onClick={handlePay}
        loading={loading}
        disabled={disabled}
      >
        Payer
      </Button>
    </Tooltip>
  );
}
