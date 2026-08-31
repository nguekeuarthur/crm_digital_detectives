import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { calculateComplexityScore, ScoringAnswers } from '../services/scoringEngine';

const prisma = new PrismaClient();

// Keep old routes just in case, but add the new direct calculate route
export const calculateDevis = async (req: Request, res: Response) => {
  try {
    const { visitorId, answers } = req.body;
    
    if (!visitorId || !answers) {
      return res.status(400).json({ error: 'visitorId et answers requis' });
    }

    // answers must have: modules, geo, target, environment, logistics
    const score = calculateComplexityScore(answers.modules || ['A'], answers as ScoringAnswers);

    let session = await prisma.chatSession.findUnique({
      where: { visitorId }
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          visitorId,
          botState: 'DONE',
          collectedData: answers,
          calculatedScore: score
        }
      });
    } else {
      session = await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          botState: 'DONE',
          collectedData: answers,
          calculatedScore: score
        }
      });
    }

    return res.status(200).json({ score, session });
  } catch (error) {
    console.error('Erreur calculateDevis:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const initChatSession = async (req: Request, res: Response) => {
  res.status(200).json({});
};

export const handleChatMessage = async (req: Request, res: Response) => {
  res.status(200).json({});
};
