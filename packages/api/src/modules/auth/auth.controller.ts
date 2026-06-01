import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../shared/middlewares/authenticate';
import { TwoFactorService } from './two-factor.service';
import { WPService } from '../wp/wp.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      WPService.syncRegisteredUserToWP({
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
      }).catch(err => console.error('[WP Sync] Erreur lors de l\'inscription :', err));

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
        return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });
      }
      throw err;
    }
  }

  static async verifyRegistration2FA(req: Request, res: Response) {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: 'userId et code requis.' });
    }
    const success = await TwoFactorService.verifyAndEnable(userId, code);
    if (!success) return res.status(400).json({ message: 'Code invalide.' });
    res.json({ message: '2FA activée avec succès.' });
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  }

  static async login2FA(req: Request, res: Response) {
    const { userId, code } = req.body;
    const tokens = await AuthService.login2FA(userId, code);
    res.json(tokens);
  }

  // --- 2FA Management (Requires authentication) ---
  static async setup2FA(req: AuthRequest, res: Response) {
    const setup = await TwoFactorService.setup(req.user!.userId);
    res.json(setup);
  }

  static async verify2FA(req: AuthRequest, res: Response) {
    const { code } = req.body;
    const success = await TwoFactorService.verifyAndEnable(req.user!.userId, code);
    if (!success) return res.status(400).json({ message: 'Code invalide' });
    res.json({ message: '2FA activée avec succès' });
  }

  static async disable2FA(req: AuthRequest, res: Response) {
    // Note: On pourrait restreindre à l'admin si besoin
    await TwoFactorService.disable((req.params.userId as string) || req.user!.userId, req.user!.userId);
    res.json({ message: '2FA désactivée' });
  }

  static async getMe(req: AuthRequest, res: Response) {
    const user = await AuthService.getMe(req.user!.userId);
    res.json(user);
  }

  static async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    const tokens = await AuthService.refresh(refreshToken);
    res.json(tokens);
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);
    res.status(204).send();
  }
}
