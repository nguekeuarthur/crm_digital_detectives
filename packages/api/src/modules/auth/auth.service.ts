import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../shared/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'superrefreshsecret';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'ADMIN' | 'ENQUETEUR' | 'SOUS_TRAITANT';
}

export class AuthService {
  static async register(data: RegisterData) {
    const { email, password, firstName, lastName, role } = data;

    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'ENQUETEUR',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    });
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Mot de passe incorrect');
    }

    return this.generateTokens(user.id, user.role);
  }

  static async refresh(refreshToken: string) {
    try {
      jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; role: string };
      
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
        throw new Error('Token de rafraîchissement invalide ou expiré');
      }

      // Rotation : on révoque l'ancien token
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true }
      });

      // On en génère de nouveaux
      return this.generateTokens(storedToken.userId, storedToken.user.role);
    } catch {
      throw new Error('Non autorisé');
    }
  }

  static async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true }
    });
  }

  private static async generateTokens(userId: string, role: string) {
    const sessionId = uuidv4();

    const accessToken = jwt.sign(
      { userId, role, sessionId },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId, role },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Stockage du refresh token en base
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      }
    });

    return { accessToken, refreshToken };
  }
}
