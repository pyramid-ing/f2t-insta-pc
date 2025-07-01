import { IsNumber, IsOptional, IsString } from 'class-validator'

export class WorkflowExportXlsxDto {
  @IsString()
  keyword: string

  @IsNumber()
  @IsOptional()
  limit?: number = 10
}

export class WorkflowSendDmToDto {
  // 멀티파트 폼 데이터로 전송되는 파일은 별도 처리
}
