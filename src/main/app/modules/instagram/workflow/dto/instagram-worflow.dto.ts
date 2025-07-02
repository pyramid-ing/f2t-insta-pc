import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class WorkflowExportXlsxDto {
  @IsString()
  @IsNotEmpty()
  keyword: string

  @IsNumber()
  @IsOptional()
  limit?: number

  @IsString()
  @IsOptional()
  orderBy?: string // 'recent' | 'top' 등
}


