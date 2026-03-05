import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcrypt') as { hash: jest.Mock; compare: jest.Mock };

const mockUser: User = {
  id: 'uuid-1',
  name: 'Alice',
  email: 'alice@example.com',
  passwordHash: 'hashed',
  avatarId: 1,
  createdAt: new Date(),
  gamePlayers: [],
};

describe('AuthService', () => {
  let service: AuthService;
  const userRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const jwtService = { sign: jest.fn(() => 'mock-token') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.register({ name: 'A', email: 'alice@example.com', password: 'pass1234', avatarId: 1 }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns access token', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ ...mockUser });
      userRepo.save.mockResolvedValue({ ...mockUser });

      const result = await service.register({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'password123',
        avatarId: 1,
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass1234' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      await expect(
        service.login({ email: 'alice@example.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns access token on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login({
        email: 'alice@example.com',
        password: 'password123',
      });
      expect(result.accessToken).toBe('mock-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
});
