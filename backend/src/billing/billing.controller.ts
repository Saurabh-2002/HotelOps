import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateFolioDto, CreateMiscChargeDto } from './dto/billing.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('booking/:bookingId')
  findAllByBooking(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.billingService.findAllByBooking(req.user.tenantId, bookingId);
  }

  @Get('folio/:id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.billingService.findOne(req.user.tenantId, id);
  }

  @Post('folio')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  createFolio(@Request() req: any, @Body() dto: CreateFolioDto) {
    return this.billingService.createFolio(req.user.tenantId, dto);
  }

  @Post('invoice/:bookingId')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  generateInvoice(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.billingService.generateInvoiceForBooking(req.user.tenantId, bookingId);
  }

  @Post('folio/:id/settle')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  settleFolio(@Request() req: any, @Param('id') id: string) {
    return this.billingService.settleFolio(req.user.tenantId, id);
  }

  // --- Miscellaneous Charges ---

  @Post('misc-charge')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  addMiscCharge(@Request() req: any, @Body() dto: CreateMiscChargeDto) {
    return this.billingService.addMiscCharge(req.user.tenantId, dto);
  }

  @Delete('misc-charge/:id')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  removeMiscCharge(@Request() req: any, @Param('id') id: string) {
    return this.billingService.removeMiscCharge(req.user.tenantId, id);
  }
}
