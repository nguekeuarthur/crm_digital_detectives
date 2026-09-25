import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export const basicAuthAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [email, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (!email || !password) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || user.role !== 'ADMIN') {
      res.set('WWW-Authenticate', 'Basic realm="401"');
      res.status(401).send('Authentication required or unauthorized role.');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.set('WWW-Authenticate', 'Basic realm="401"');
      res.status(401).send('Authentication required.');
      return;
    }

    // Pass
    next();
  } catch (error) {
    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(401).send('Authentication required.');
    return;
  }
};
