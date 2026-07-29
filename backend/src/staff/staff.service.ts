import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const users = await this.prisma.withTenant(tenantId, async (tx) => {
      return tx.user.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
    });
    // Strip passwords
    return users.map(({ hashedPassword, ...rest }) => rest);
  }

  async create(tenantId: string, currentUserRole: string, dto: CreateStaffDto) {
    // 1. Role checks
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot create SUPER_ADMIN accounts');
    }
    if (dto.role === 'OWNER' && currentUserRole !== 'OWNER') {
      throw new ForbiddenException('Only Owners can create other Owner accounts');
    }

    // 2. Email uniqueness check (bypassing RLS because emails must be unique globally)
    const existing = await this.prisma.withBypassRls(async (tx) => {
      return tx.user.findUnique({ where: { email: dto.email } });
    });
    
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // 3. Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // 4. Create user
    const user = await this.prisma.withTenant(tenantId, async (tx) => {
      return tx.user.create({
        data: {
          tenantId,
          name: dto.name,
          email: dto.email,
          hashedPassword,
          role: dto.role,
        },
      });
    });

    const { hashedPassword: _, ...rest } = user;
    return rest;
  }

  async update(tenantId: string, id: string, currentUserRole: string, dto: UpdateStaffDto) {
    // 1. Fetch user to ensure it exists and belongs to tenant
    const targetUser = await this.prisma.withTenant(tenantId, async (tx) => {
      return tx.user.findFirst({
        where: { id, tenantId },
      });
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // 2. Role checks
    if (targetUser.role === 'OWNER' && currentUserRole !== 'OWNER') {
      throw new ForbiddenException('Managers cannot modify Owner accounts');
    }
    if (dto.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Cannot change role to SUPER_ADMIN');
    }
    if (dto.role === 'OWNER' && currentUserRole !== 'OWNER') {
      throw new ForbiddenException('Managers cannot grant Owner role');
    }

    // 3. Email uniqueness if changing email
    if (dto.email && dto.email !== targetUser.email) {
      const existing = await this.prisma.withBypassRls(async (tx) => {
        return tx.user.findUnique({ where: { email: dto.email } });
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // 4. Update data payload
    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.email) updateData.email = dto.email;
    if (dto.role) updateData.role = dto.role;

    if (dto.password) {
      const saltRounds = 10;
      updateData.hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    }

    const updatedUser = await this.prisma.withTenant(tenantId, async (tx) => {
      return tx.user.update({
        where: { id },
        data: updateData,
      });
    });

    const { hashedPassword: _, ...rest } = updatedUser;
    return rest;
  }

  async remove(tenantId: string, id: string, currentUserId: string, currentUserRole: string) {
    if (id === currentUserId) {
      throw new ForbiddenException('Cannot delete your own account. Contact an administrator.');
    }

    const targetUser = await this.prisma.withTenant(tenantId, async (tx) => {
      return tx.user.findFirst({
        where: { id, tenantId },
      });
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === 'OWNER' && currentUserRole !== 'OWNER') {
      throw new ForbiddenException('Managers cannot delete Owner accounts');
    }

    await this.prisma.withTenant(tenantId, async (tx) => {
      await tx.user.delete({
        where: { id },
      });
    });

    return { success: true };
  }
}
