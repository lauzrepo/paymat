import bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import prisma from '../config/database';
import { config } from '../config/environment';
import { AppError } from '../middleware/errorHandler';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gdprConsent: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
}

class UserService {
  async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { email, password, firstName, lastName, gdprConsent } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        gdprConsent,
        gdprConsentDate: gdprConsent ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return user;
  }

  async authenticateUser(email: string, password: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { email },
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
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return user;
  }

  async updateUser(
    userId: string,
    updateData: { firstName?: string; lastName?: string }
  ): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Soft delete
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export default new UserService();
