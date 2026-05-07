import React from 'react';
import { MantineProvider, createTheme } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';

const queryClient = new QueryClient();

const theme = createTheme({
  primaryColor: 'brand',
  defaultRadius: 'lg',
  fontFamily: 'Inter, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: '900',
  },
  shadows: {
    xs: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
    sm: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06)',
    md: '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -2px rgba(0,0,0,0.05)',
    lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
    xl: '0 25px 50px -12px rgba(0,0,0,0.15)',
  },
  colors: {
    brand: [
      '#eef2ff',
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#6366f1',
      '#4f46e5',
      '#4338ca',
      '#3730a3',
      '#312e81',
    ],
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
}
