import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import prisma from '../config/database';
import { config } from '../config/environment';
import { AppError } from '../middleware/errorHandler';

export interface CreateUserData {
  organizationId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  contactId?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  organizationId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: Date;
}

class UserService {
  async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { organizationId, email, password, firstName, lastName, role = 'admin', contactId } = userData;

    const existingUser = await prisma.user.findFirst({
      where: { organizationId, email },
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        organizationId,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        contactId,
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async authenticateUser(organizationId: string, email: string, password: string): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { organizationId, email },
    });

    if (!user || user.deletedAt) {
      throw new AppError(401, 'Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    return user;
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    return prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        organizationId: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }
}

export default new UserService();
