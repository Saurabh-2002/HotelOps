import { Controller, Get, Post, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findByDate(@Request() req, @Query('date') date: string) {
    if (!date) {
      throw new BadRequestException('Date query parameter is required');
    }
    return this.attendanceService.findByDate(req.user, date);
  }

  @Post()
  markAttendance(@Request() req, @Body() dto: MarkAttendanceDto) {
    const isManager = req.user.role === 'OWNER' || req.user.role === 'MANAGER';
    if (!isManager && dto.userId !== req.user.id) {
      throw new BadRequestException('You can only mark your own attendance');
    }
    return this.attendanceService.markAttendance(req.user.tenantId, dto);
  }
}
