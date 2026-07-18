import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
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
  getMenu(@Request() req: any, @Query('includeUnavailable') includeUnavailable?: string) {
    return this.posService.findAllMenuItems(req.user.tenantId, includeUnavailable === 'true');
  }

  @Post('menu')
  @Roles('OWNER', 'MANAGER')
  createMenuItem(@Request() req: any, @Body() dto: CreateMenuItemDto) {
    return this.posService.createMenuItem(req.user.tenantId, dto);
  }

  @Patch('menu/:id')
  @Roles('OWNER', 'MANAGER')
  updateMenuItem(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateMenuItemDto>) {
    return this.posService.updateMenuItem(req.user.tenantId, id, dto);
  }

  @Delete('menu/:id')
  @Roles('OWNER', 'MANAGER')
  removeMenuItem(@Request() req: any, @Param('id') id: string) {
    return this.posService.removeMenuItem(req.user.tenantId, id);
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
  @Roles('OWNER', 'MANAGER', 'RESTAURANT', 'FRONT_DESK')
  settleOrder(@Request() req: any, @Param('id') id: string, @Body() dto: SettlePosOrderDto) {
    if (req.user.role === 'FRONT_DESK' && dto.method === 'CASH') {
      throw new ForbiddenException('FRONT_DESK is not authorized to perform CASH settlement');
    }
    return this.posService.settleOrder(req.user.tenantId, id, dto);
  }
}
