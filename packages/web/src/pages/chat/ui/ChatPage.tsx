import React, { useEffect, useState, useRef } from 'react';
import { Container, Paper, Title, Grid, List, ThemeIcon, Text, Box, TextInput, ActionIcon, ScrollArea, Group, Badge, Avatar } from '@mantine/core';
import { MessageSquare, Send, User, Bot, AlertCircle } from 'lucide-react';
import { fetchSessions, fetchSessionMessages, ChatSession, ChatMessage } from '../api/chat.api';

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      setSessions(data);
    } catch (err) {
      console.error("Erreur chargement sessions", err);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setSelectedSession(session);
    try {
      const fullSession = await fetchSessionMessages(session.id);
      setMessages(fullSession.messages);
    } catch (err) {
      console.error("Erreur chargement messages", err);
    }
  };

  useEffect(() => {
    loadSessions();

    const ws = new WebSocket("ws://localhost:3000/ws");
    ws.onopen = () => {
      console.log("Connecté au chat CRM (Agent)");
      ws.send(JSON.stringify({ type: "chat:join", data: { role: "agent" } }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat:message") {
          const { text, sender, visitorId, timestamp } = msg.data;
          
          // Mettre à jour la session sélectionnée si c'est le bon visiteur
          setSelectedSession((curr) => {
            if (curr && curr.visitorId === visitorId) {
              setMessages((prev) => [...prev, {
                id: Math.random().toString(),
                sessionId: curr.id,
                sender,
                text,
                createdAt: timestamp || new Date().toISOString()
              }]);
            }
            return curr;
          });

          // Recharger les sessions pour afficher le dernier message
          loadSessions();
        }
      } catch (err) {
        console.error(err);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !socket || !selectedSession) return;
    
    // Envoyer au serveur
    socket.send(JSON.stringify({ 
      type: "chat:message", 
      data: { text: inputText, sender: "agent", visitorId: selectedSession.visitorId } 
    }));
    
    // Affichage optimiste local
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      sessionId: selectedSession.id,
      sender: 'AGENT',
      text: inputText,
      createdAt: new Date().toISOString()
    }]);

    setInputText('');
  };

  return (
    <Container size="xl" py="md">
      <Grid gutter="md">
        {/* Liste des sessions */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" shadow="sm" radius="md" withBorder h={700} style={{ display: 'flex', flexDirection: 'column' }}>
            <Title order={3} mb="md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={20} />
              Conversations
            </Title>
            <ScrollArea flex={1}>
              <List spacing="sm" size="sm" center>
                {sessions.map((session) => (
                  <Paper 
                    key={session.id} 
                    p="sm" 
                    withBorder 
                    style={{ 
                      cursor: 'pointer', 
                      backgroundColor: selectedSession?.id === session.id ? 'var(--mantine-color-gray-1)' : 'transparent',
                      borderColor: selectedSession?.id === session.id ? 'var(--mantine-color-yellow-6)' : undefined
                    }}
                    onClick={() => selectSession(session)}
                  >
                    <Group justify="space-between" mb={5}>
                      <Text fw={500} size="sm">Visiteur Anonyme</Text>
                      {session.status === 'HUMAN' && <Badge color="red" size="xs" variant="light">Attente Agent</Badge>}
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {session.messages[0]?.text || "Nouvelle discussion..."}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {new Date(session.updatedAt).toLocaleTimeString()}
                    </Text>
                  </Paper>
                ))}
                {sessions.length === 0 && (
                  <Text c="dimmed" ta="center" mt="xl">Aucune conversation active</Text>
                )}
              </List>
            </ScrollArea>
          </Paper>
        </Grid.Col>

        {/* Fenêtre de chat */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="0" shadow="sm" radius="md" withBorder h={700} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedSession ? (
              <>
                <Box p="md" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                  <Group>
                    <Avatar radius="xl"><User size={20} /></Avatar>
                    <div>
                      <Text fw={500}>Visiteur Anonyme</Text>
                      <Text size="xs" c="dimmed">ID: {selectedSession.visitorId}</Text>
                    </div>
                  </Group>
                </Box>
                
                <ScrollArea flex={1} p="md" viewportRef={scrollRef}>
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {messages.map((msg) => {
                      const isAgent = msg.sender === 'AGENT';
                      const isSystem = msg.sender === 'SYSTEM';
                      
                      if (isSystem) {
                        return (
                          <Center key={msg.id} my="xs">
                            <Badge color="gray" variant="light" leftSection={<AlertCircle size={12} />}>
                              {msg.text}
                            </Badge>
                          </Center>
                        );
                      }

                      return (
                        <Box 
                          key={msg.id} 
                          style={{ 
                            alignSelf: isAgent ? 'flex-end' : 'flex-start',
                            maxWidth: '70%'
                          }}
                        >
                          <Group gap="xs" mb={4} style={{ flexDirection: isAgent ? 'row-reverse' : 'row' }}>
                            <ThemeIcon size={24} radius="xl" color={isAgent ? 'yellow.7' : 'gray.3'} variant={isAgent ? 'filled' : 'light'}>
                              {isAgent ? <User size={14} /> : (msg.sender === 'BOT' ? <Bot size={14} /> : <User size={14} />)}
                            </ThemeIcon>
                            <Text size="xs" c="dimmed">
                              {msg.sender} • {new Date(msg.createdAt).toLocaleTimeString()}
                            </Text>
                          </Group>
                          <Paper 
                            p="sm" 
                            radius="md" 
                            bg={isAgent ? 'yellow.0' : 'white'} 
                            withBorder
                          >
                            <Text size="sm">{msg.text}</Text>
                          </Paper>
                        </Box>
                      );
                    })}
                  </Box>
                </ScrollArea>

                <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                    <TextInput
                      placeholder="Répondre au visiteur..."
                      value={inputText}
                      onChange={(e) => setInputText(e.currentTarget.value)}
                      rightSection={
                        <ActionIcon type="submit" color="yellow.7" variant="filled" disabled={!inputText.trim()}>
                          <Send size={16} />
                        </ActionIcon>
                      }
                    />
                  </form>
                </Box>
              </>
            ) : (
              <Center h="100%">
                <Box ta="center">
                  <MessageSquare size={48} color="var(--mantine-color-gray-4)" />
                  <Text c="dimmed" mt="md">Sélectionnez une conversation pour commencer à discuter</Text>
                </Box>
              </Center>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
