import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string } | undefined;

    if (!user?.id) throw new ForbiddenException('Authentication required');

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: user.id },
      select: { isActive: true },
    });

    if (!adminUser?.isActive) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
