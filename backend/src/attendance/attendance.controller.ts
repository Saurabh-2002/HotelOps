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

  @Get('summary')
  getSummary(@Request() req, @Query('range') range: string) {
    return this.attendanceService.getAttendanceSummary(req.user, range || 'month');
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  markAttendance(@Request() req, @Body() dto: MarkAttendanceDto) {
    return this.attendanceService.markAttendance(req.user.tenantId, dto);
  }
}

