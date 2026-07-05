import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.bookingsService.findAll(req.user.tenantId, { status, roomId });
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.bookingsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK')
  create(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.bookingsService.update(req.user.tenantId, id, dto);
  }

  @Post(':id/check-in')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK')
  checkIn(@Request() req: any, @Param('id') id: string) {
    return this.bookingsService.checkIn(req.user.tenantId, id);
  }

  @Post(':id/check-out')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK')
  checkOut(@Request() req: any, @Param('id') id: string) {
    return this.bookingsService.checkOut(req.user.tenantId, id);
  }

  @Post(':id/cancel')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.bookingsService.cancel(req.user.tenantId, id);
  }
}
