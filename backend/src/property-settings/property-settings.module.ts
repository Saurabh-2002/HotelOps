import { Module } from '@nestjs/common';
import { PropertySettingsController } from './property-settings.controller';
import { PropertySettingsService } from './property-settings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PropertySettingsController],
  providers: [PropertySettingsService]
})
export class PropertySettingsModule {}
