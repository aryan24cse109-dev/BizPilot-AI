import prisma from '../config/db.js';

export class WorkspaceService {
  static async listUserWorkspaces(userId) {
    const owned = await prisma.businessWorkspace.findMany({
      where: { ownerId: userId, isActive: true },
      include: {
        businessProfile: true,
        _count: {
          select: { invoices: true, members: true }
        }
      }
    });

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            businessProfile: true,
            _count: {
              select: { invoices: true, members: true }
            }
          }
        }
      }
    });

    return {
      owned,
      memberships: memberships.map((m) => ({
        role: m.role,
        workspace: m.workspace,
      })),
    };
  }

  static async createWorkspace(userId, { name, currency = 'INR', businessType = 'Freelancer' }) {
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.businessWorkspace.create({
        data: {
          name,
          slug,
          ownerId: userId,
          currency,
          businessProfile: {
            create: {
              businessName: name,
              businessType,
              country: 'India',
            }
          },
          members: {
            create: {
              userId,
              role: 'OWNER',
            }
          }
        },
        include: {
          businessProfile: true,
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          workspaceId: workspace.id,
          action: 'WORKSPACE_CREATED',
          entityType: 'BusinessWorkspace',
          entityId: workspace.id,
          details: { name, slug, currency },
        }
      });

      return workspace;
    }, { maxWait: 15000, timeout: 30000 });
  }

  static async updateBusinessProfile(workspaceId, data) {
    const profile = await prisma.businessProfile.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        businessName: data.businessName || 'My Business',
        ...data,
      },
      update: {
        ...data,
      }
    });

    return profile;
  }

  static async getWorkspaceDetails(workspaceId) {
    const workspace = await prisma.businessWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        businessProfile: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, username: true }
            }
          }
        },
        paymentAccounts: true,
        _count: {
          select: { invoices: true, payments: true }
        }
      }
    });

    return workspace;
  }
}
