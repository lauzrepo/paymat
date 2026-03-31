import userService from '../../../src/services/userService';
import prisma from '../../../src/config/database';
import bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockUser = (overrides = {}) => ({
  id: 'user-1',
  organizationId: 'org-1',
  email: 'test@example.com',
  passwordHash: '$2b$10$hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: 'admin',
  contactId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
  passwordResetToken: null,
  passwordResetExpiry: null,
  ...overrides,
});

describe('UserService', () => {
  describe('createUser', () => {
    it('throws 409 if a user with the same email already exists in the org', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser());

      await expect(
        userService.createUser({ organizationId: 'org-1', email: 'test@example.com', password: 'pass' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'User with this email already exists' });

      expect(prisma.user.create as jest.Mock).not.toHaveBeenCalled();
    });

    it('hashes the password before creating the user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$newhash');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-2', email: 'new@example.com', organizationId: 'org-1',
        firstName: null, lastName: null, role: 'admin', createdAt: new Date(),
      });

      await userService.createUser({ organizationId: 'org-1', email: 'new@example.com', password: 'mypassword' });

      expect(bcrypt.hash as jest.Mock).toHaveBeenCalledWith('mypassword', expect.any(Number));
      expect(prisma.user.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: '$2b$10$newhash' }),
        }),
      );
    });

    it('defaults role to admin when not provided', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-2', email: 'new@example.com', organizationId: 'org-1',
        firstName: null, lastName: null, role: 'admin', createdAt: new Date(),
      });

      await userService.createUser({ organizationId: 'org-1', email: 'new@example.com', password: 'pass' });

      expect(prisma.user.create as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'admin' }) }),
      );
    });

    it('does not include passwordHash in the returned user (select omits it)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      const returned = { id: 'u1', email: 'x@y.com', organizationId: 'org-1', firstName: null, lastName: null, role: 'admin', createdAt: new Date() };
      (prisma.user.create as jest.Mock).mockResolvedValue(returned);

      const result = await userService.createUser({ organizationId: 'org-1', email: 'x@y.com', password: 'pw' });

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('authenticateUser', () => {
    it('throws 401 if user is not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(userService.authenticateUser('org-1', 'nobody@x.com', 'pw')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('throws 401 if user has been soft-deleted (deletedAt set)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser({ deletedAt: new Date() }));

      await expect(userService.authenticateUser('org-1', 'test@example.com', 'pw')).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('throws 401 if password is wrong', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(userService.authenticateUser('org-1', 'test@example.com', 'wrongpw')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('returns the full user object on success', async () => {
      const user = mockUser();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await userService.authenticateUser('org-1', 'test@example.com', 'correctpw');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('getUserById', () => {
    it('returns the user (without passwordHash) when found', async () => {
      const returned = { id: 'user-1', email: 'test@example.com', organizationId: 'org-1', firstName: 'Test', lastName: 'User', role: 'admin', createdAt: new Date() };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(returned);

      const result = await userService.getUserById('user-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when user is not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserById('missing');

      expect(result).toBeNull();
    });

    it('queries with deletedAt: null to exclude soft-deleted users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await userService.getUserById('user-1');

      expect(prisma.user.findUnique as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1', deletedAt: null } }),
      );
    });
  });

  describe('deleteUser', () => {
    it('soft-deletes the user by setting deletedAt to a Date', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser({ deletedAt: new Date() }));

      await userService.deleteUser('user-1');

      expect(prisma.user.update as jest.Mock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
