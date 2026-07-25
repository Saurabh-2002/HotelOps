import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardStats(
    @Request() req: any,
    @Query('range') range?: string // e.g., 'month', 'year', 'all'
  ) {
    return this.analyticsService.getDashboardStats(req.user.tenantId, range);
  }
}
