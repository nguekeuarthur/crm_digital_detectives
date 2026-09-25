import { Card, Text, Title, Group, ThemeIcon, Stack } from '@mantine/core';
import { formatCurrency } from '../../../shared/constants';
import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  change: string;
  icon?: React.ReactNode;
  currency?: boolean;
}

export function StatCard({ label, value, change, icon, currency }: StatCardProps) {
  // Format value with currency if needed
  let displayValue = value;
  if (currency && typeof value === 'number') {
    displayValue = formatCurrency(value);
  }

  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>
          {label}
        </Text>
        {icon && <ThemeIcon radius="md" size="lg" variant="light">{icon}</ThemeIcon>}
      </Group>
      <Stack gap={4}>
        <Title order={3}>{displayValue}</Title>
        <Text c="teal" size="xs" fw={500}>
          {change}
        </Text>
      </Stack>
    </Card>
  );
}
