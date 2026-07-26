import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DormancyService {
  private readonly logger = new Logger(DormancyService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDormantAccounts() {
    this.logger.log('Running dormant accounts cleanup job...');
    
    // Find tenants whose lastLogin is older than 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const dormantTenants = await this.prisma.withBypassRls(async (tx) => {
      return tx.tenant.findMany({
        where: {
          lastLogin: {
            lt: sixtyDaysAgo
          }
        },
        select: { id: true, name: true }
      });
    });

    if (dormantTenants.length === 0) {
      this.logger.log('No dormant accounts found.');
      return;
    }

    this.logger.log(`Found ${dormantTenants.length} dormant account(s) to delete.`);

    for (const tenant of dormantTenants) {
      try {
        await this.prisma.withBypassRls(async (tx) => {
          // Because of onDelete: Cascade on all relations, deleting the tenant
          // will automatically wipe out their Users, Rooms, Bookings, PosOrders, etc.
          await tx.tenant.delete({
            where: { id: tenant.id }
          });
        });
        this.logger.log(`Successfully deleted dormant account: ${tenant.name} (${tenant.id})`);
      } catch (error) {
        this.logger.error(`Failed to delete dormant account: ${tenant.id}`, error);
      }
    }
    
    this.logger.log('Dormant accounts cleanup job completed.');
  }
}
