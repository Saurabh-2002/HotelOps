import { IsString, IsDateString, IsEnum } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class RequestLeaveDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  reason: string;
}

export class UpdateLeaveStatusDto {
  @IsEnum(LeaveStatus)
  status: LeaveStatus;
}
