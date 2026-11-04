import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { ENV } from '../config/env.js';

export class AuthService {
  static async register({ name, email, username, password, workspaceName, businessType }) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error('An account with this email already exists.');
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new Error('This username is already taken. Please choose another.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const wsName = workspaceName || `${name.split(' ')[0]}'s Business`;
    const wsSlug = `${username.toLowerCase()}-${Date.now().toString(36)}`;

    // Create user, profile, default business workspace, and membership in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          username,
          passwordHash,
          profile: {
            create: {
              preferredLang: 'en',
              theme: 'dark',
            }
          },
          workspacesOwned: {
            create: {
              name: wsName,
              slug: wsSlug,
              currency: 'INR',
              businessProfile: {
                create: {
                  businessName: wsName,
                  businessType: businessType || 'Freelancer',
                  country: 'India',
                  email: email,
                }
              }
            }
          }
        },
        include: {
          profile: true,
          workspacesOwned: {
            include: {
              businessProfile: true,
            }
          }
        }
      });

      // Add as OWNER member
      const defaultWorkspace = newUser.workspacesOwned[0];
      await tx.workspaceMember.create({
        data: {
          workspaceId: defaultWorkspace.id,
          userId: newUser.id,
          role: 'OWNER',
        }
      });

      // Record audit log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          workspaceId: defaultWorkspace.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: newUser.id,
          details: { email, username, workspaceName: wsName },
        }
      });

      return newUser;
    }, { maxWait: 15000, timeout: 30000 });

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profile: user.profile,
        activeWorkspace: user.workspacesOwned[0],
      },
      token,
    };
  }

  static async login({ emailOrUsername, password }) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      },
      include: {
        profile: true,
        workspacesOwned: {
          include: { businessProfile: true }
        },
        workspaceMembers: {
          include: {
            workspace: {
              include: { businessProfile: true }
            }
          }
        }
      }
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email/username or password.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email/username or password.');
    }

    if (user.accountStatus !== 'ACTIVE') {
      throw new Error(`Your account is currently ${user.accountStatus.toLowerCase()}.`);
    }

    const activeWorkspace = user.workspacesOwned[0] || user.workspaceMembers[0]?.workspace;

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        workspaceId: activeWorkspace?.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
      }
    });

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profile: user.profile,
        activeWorkspace,
        workspacesOwned: user.workspacesOwned,
        workspaceMembers: user.workspaceMembers,
      },
      token,
    };
  }

  static generateToken(userId) {
    return jwt.sign({ userId }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });
  }

  static async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        workspacesOwned: {
          include: { businessProfile: true }
        },
        workspaceMembers: {
          include: {
            workspace: {
              include: { businessProfile: true }
            }
          }
        }
      }
    });

    if (!user) throw new Error('User not found.');

    const activeWorkspace = user.workspacesOwned[0] || user.workspaceMembers[0]?.workspace;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      accountStatus: user.accountStatus,
      profile: user.profile,
      activeWorkspace,
      workspacesOwned: user.workspacesOwned,
      workspaceMembers: user.workspaceMembers,
    };
  }
}
