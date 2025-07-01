import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class GlobalSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(1000)
  minDelay?: number

  @IsOptional()
  @IsNumber()
  @Min(1000)
  maxDelay?: number

  @IsOptional()
  @IsString()
  loginId?: string

  @IsOptional()
  @IsString()
  loginPassword?: string
}
