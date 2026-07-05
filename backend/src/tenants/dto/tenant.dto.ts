import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsEnum(['BASIC', 'PRO', 'ENTERPRISE'])
  @IsOptional()
  subscriptionTier?: string;

  @IsArray()
  @IsOptional()
  activeModules?: string[];
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsEnum(['BASIC', 'PRO', 'ENTERPRISE'])
  @IsOptional()
  subscriptionTier?: string;

  @IsArray()
  @IsOptional()
  activeModules?: string[];
}
