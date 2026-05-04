import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    const user = await AuthService.register(req.body);
    res.status(201).json(user);
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const tokens = await AuthService.login(email, password);
    res.json(tokens);
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
