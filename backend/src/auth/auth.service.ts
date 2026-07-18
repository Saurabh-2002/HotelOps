import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
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

  async signup(dto: any) {
    const { name, email, password, propertyName, city, country, modules } = dto;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.withBypassRls(async (tx) => {
      // Check if user already exists
      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: propertyName,
          activeModules: modules,
        }
      });

      // Create Owner User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          hashedPassword,
          role: 'OWNER'
        }
      });

      // Create Default PropertySettings
      await tx.propertySettings.create({
        data: {
          tenantId: tenant.id,
          propertyName,
          city: city || '',
          country: country || 'India',
        }
      });

      // Log them in immediately
      return this.login({...user, tenant});
    });
  }
}
