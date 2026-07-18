import { Controller, Get, Post, Body, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { RoomTypesService, CreateRoomTypeDto, UpdateRoomTypeDto } from './room-types.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('room-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK')
  findAll(@Request() req: any) {
    return this.roomTypesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'FRONT_DESK')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.roomTypesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER')
  create(@Request() req: any, @Body() dto: CreateRoomTypeDto) {
    return this.roomTypesService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'OWNER', 'MANAGER')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRoomTypeDto) {
    return this.roomTypesService.update(req.user.tenantId, id, dto);
  }
}
