import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'secret_dev_123';
  private readonly expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  signToken(payload: Record<string, any>) {
    return jwt.sign(payload, this.jwtSecret as jwt.Secret, { expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'] });
  }

  verifyToken(token: string) {
    return jwt.verify(token, this.jwtSecret) as Record<string, any>;
  }
}
