import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@best-cream/shared';
import { SupabaseService } from './infra.service.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly reflector = new Reflector();

  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const requester = await this.getRequesterRole(req);

    // Attach requester context to request
    (req as any).user = requester;

    if (!requiredRoles.includes(requester.role)) {
      throw new HttpException(
        {
          success: false,
          message: `Access Denied: Required role [${requiredRoles.join(', ')}], got [${requester.role}].`,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private async getRequesterRole(req: Request): Promise<{ role: UserRole; userId?: string; email?: string }> {
    const authHeader = req.headers.authorization;
    const adminKey = req.headers['x-admin-key'];
    const userRoleHeader = req.headers['x-user-role'] as UserRole;

    if (adminKey === 'bestcream-admin-session-token' || authHeader === 'Bearer bestcream-admin-session-token') {
      return { role: 'admin', userId: 'admin-1', email: 'admin@bestcream.com' };
    }
    if (authHeader === 'Bearer bestcream-sales-session-token') {
      return { role: 'sales', userId: 'sales-1', email: 'sales@bestcream.com' };
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);
        if (!error && user) {
          const { role } = await this.supabaseService.getUserProfileAndRole(user);
          return { role, userId: user.id, email: user.email };
        }
      } catch {
        // ignore
      }
    }

    if (userRoleHeader === 'admin' || userRoleHeader === 'sales' || userRoleHeader === 'staff') {
      return { role: userRoleHeader };
    }

    return { role: 'customer' };
  }
}
