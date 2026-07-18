import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.roomsService.findAll(req.user.tenantId, pageNum, limitNum, search);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles('OWNER', 'MANAGER')
  create(@Request() req: any, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'MANAGER')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'MANAGER')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.roomsService.remove(req.user.tenantId, id);
  }
}
