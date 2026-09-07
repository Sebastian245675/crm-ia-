import { Injectable } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

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

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(String(password), salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  verifyPassword(password: string, storedPassword: string) {
    const stored = String(storedPassword || '');
    if (!stored.startsWith('scrypt$')) {
      // Compatibilidad temporal con las cuentas antiguas; se migran al iniciar sesión.
      return String(password) === stored;
    }

    const [, salt, expectedHex] = stored.split('$');
    if (!salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
