import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  findAll(@Request() req) {
    return this.staffService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateStaffDto) {
    return this.staffService.create(req.user.tenantId, req.user.role, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(req.user.tenantId, id, req.user.role, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.staffService.remove(req.user.tenantId, id, req.user.id, req.user.role);
  }
}
