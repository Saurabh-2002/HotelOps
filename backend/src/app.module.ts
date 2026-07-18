import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { BillingModule } from './billing/billing.module';
import { PosModule } from './pos/pos.module';
import { PropertySettingsModule } from './property-settings/property-settings.module';
import { RoomTypesModule } from './room-types/room-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    RoomsModule,
    BookingsModule,
    BillingModule,
    PosModule,
    PropertySettingsModule,
    RoomTypesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
