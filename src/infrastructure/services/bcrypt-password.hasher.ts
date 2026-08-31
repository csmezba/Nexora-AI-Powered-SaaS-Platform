import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../domain/services/password-hasher.interface.js';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly saltRounds = 10;

  async hash(plainText: string): Promise<string> {
    if (!plainText) {
      throw new Error('Password to hash cannot be empty');
    }
    return bcrypt.hash(plainText, this.saltRounds);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    if (!plainText || !hash) {
      return false;
    }
    return bcrypt.compare(plainText, hash);
  }
}
