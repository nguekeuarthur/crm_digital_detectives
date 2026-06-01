import { Container, Title, Text, Button, Group, Center, Box, Image } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center style={{ height: '100vh', backgroundColor: '#0a0900' }}>
      <Container size="md" style={{ textAlign: 'center' }}>
        <Box mb={40}>
          <Image
            src="/logo-dore.png"
            alt="Digital Detectives Logo"
            h={80}
            fit="contain"
            style={{ margin: '0 auto' }}
          />
        </Box>
        <Title
          order={1}
          style={{
            fontSize: '8rem',
            fontWeight: 900,
            lineHeight: 1,
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
          }}
        >
          404
        </Title>
        <Title
          order={2}
          style={{
            fontSize: '2rem',
            marginTop: '2rem',
            marginBottom: '1rem',
            color: '#fff'
          }}
        >
          Page Introuvable
        </Title>
        <Text c="dimmed" size="lg" mb={30}>
          Il semble que vous vous soyez égaré dans vos recherches.
          L&apos;URL demandée n&apos;existe pas ou a été déplacée.
        </Text>
        <Group justify="center">
          <Button
            size="lg"
            variant="outline"
            color="yellow"
            onClick={() => navigate('/')}
            style={{ borderColor: '#FFD700', color: '#FFD700' }}
          >
            Retourner à l&apos;accueil
          </Button>
        </Group>
      </Container>
    </Center>
  );
}
