import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    // Bypass RLS for login — we need to look up the user across all tenants
    const user = await this.prisma.withBypassRls(async (tx) => {
      return tx.user.findUnique({
        where: { email },
        include: { tenant: true },
      });
    });

    if (user && await bcrypt.compare(pass, user.hashedPassword)) {
      const { hashedPassword, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      tenantId: user.tenantId,
      activeModules: user.tenant?.activeModules || []
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenant?.name || null,
        activeModules: user.tenant?.activeModules || [],
      }
    };
  }
}
