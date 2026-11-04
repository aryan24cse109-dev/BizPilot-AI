import prisma from '../config/db.js';

/**
 * Require valid workspace membership and role.
 * Resolves workspaceId from header ('x-workspace-id'), query params, or route params.
 */
export const requireWorkspace = (allowedRoles = ['OWNER', 'ADMIN', 'FINANCE_MANAGER', 'MEMBER']) => {
  return async (req, res, next) => {
    try {
      const workspaceId = 
        req.headers['x-workspace-id'] || 
        req.params.workspaceId || 
        req.query.workspaceId || 
        req.body?.workspaceId;

      if (!workspaceId) {
        // Fallback: If user has at least one owned workspace, auto-select their default workspace
        const defaultOwned = req.user.workspacesOwned?.[0];
        if (defaultOwned) {
          req.workspace = defaultOwned;
          req.workspaceRole = 'OWNER';
          return next();
        }

        const defaultMember = req.user.workspaceMembers?.[0];
        if (defaultMember) {
          req.workspace = defaultMember.workspace;
          req.workspaceRole = defaultMember.role;
          return next();
        }

        return res.status(400).json({
          success: false,
          message: 'Workspace context is required. Please specify a workspace ID.',
        });
      }

      // Verify workspace exists
      const workspace = await prisma.businessWorkspace.findUnique({
        where: { id: workspaceId },
        include: {
          businessProfile: true,
        }
      });

      if (!workspace || !workspace.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found or is currently inactive.',
        });
      }

      // Check if user is owner
      if (workspace.ownerId === req.user.id) {
        req.workspace = workspace;
        req.workspaceRole = 'OWNER';
        return next();
      }

      // Check membership
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: req.user.id,
          }
        }
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not a member of this workspace.',
        });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Permission denied. Required role: ${allowedRoles.join(', ')}. Your role: ${membership.role}`,
        });
      }

      req.workspace = workspace;
      req.workspaceRole = membership.role;
      next();
    } catch (error) {
      console.error('Workspace middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal workspace authorization error.',
      });
    }
  };
};
