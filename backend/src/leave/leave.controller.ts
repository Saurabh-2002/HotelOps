import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { RequestLeaveDto, UpdateLeaveStatusDto } from './dto/leave.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('leave')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  requestLeave(@Request() req, @Body() dto: RequestLeaveDto) {
    return this.leaveService.requestLeave(req.user.tenantId, req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.leaveService.findAll(req.user.tenantId, req.user);
  }

  @Patch(':id/status')
  updateStatus(@Request() req, @Param('id') id: string, @Body() dto: UpdateLeaveStatusDto) {
    return this.leaveService.updateStatus(req.user.tenantId, id, req.user, dto);
  }
}
