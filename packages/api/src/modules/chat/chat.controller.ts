import { Request, Response } from 'express';
import { prisma } from '../../shared/prisma';

export const getSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    return res.json(sessions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getSessionMessages = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    return res.json(session);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
