import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PosService } from './pos.service';
import { CreateMenuItemDto, CreatePosOrderDto, SettlePosOrderDto } from './dto/pos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('menu')
  @Roles('OWNER', 'MANAGER', 'FRONT_DESK', 'RESTAURANT')
  getMenu(@Request() req: any) {
    return this.posService.findAllMenuItems(req.user.tenantId);
  }

  @Post('menu')
  @Roles('OWNER', 'MANAGER')
  createMenuItem(@Request() req: any, @Body() dto: CreateMenuItemDto) {
    return this.posService.createMenuItem(req.user.tenantId, dto);
  }

  @Get('orders')
  @Roles('OWNER', 'MANAGER', 'RESTAURANT')
  getOrders(@Request() req: any) {
    return this.posService.findAllOrders(req.user.tenantId);
  }

  @Post('orders')
  @Roles('OWNER', 'MANAGER', 'RESTAURANT')
  createOrder(@Request() req: any, @Body() dto: CreatePosOrderDto) {
    return this.posService.createOrder(req.user.tenantId, dto);
  }

  @Patch('orders/:id/status')
  @Roles('OWNER', 'MANAGER', 'RESTAURANT')
  updateOrderStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: 'KOT_PRINTED' | 'SERVED' | 'BILLED' | 'CANCELLED') {
    return this.posService.updateOrderStatus(req.user.tenantId, id, status);
  }

  @Post('orders/:id/settle')
  @Roles('OWNER', 'MANAGER', 'RESTAURANT')
  settleOrder(@Request() req: any, @Param('id') id: string, @Body() dto: SettlePosOrderDto) {
    return this.posService.settleOrder(req.user.tenantId, id, dto);
  }
}
