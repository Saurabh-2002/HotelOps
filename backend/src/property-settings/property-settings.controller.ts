import { Controller, Get, Body, Patch, Request, UseGuards } from '@nestjs/common';
import { PropertySettingsService, UpdatePropertySettingsDto } from './property-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertySettingsController {
  constructor(private readonly propertySettingsService: PropertySettingsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'RESTAURANT', 'ACCOUNTANT')
  async getSettings(@Request() req) {
    return this.propertySettingsService.getSettings(req.user.tenantId);
  }

  @Patch()
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER')
  async updateSettings(@Request() req, @Body() dto: UpdatePropertySettingsDto) {
    return this.propertySettingsService.updateSettings(req.user.tenantId, dto);
  }
}
