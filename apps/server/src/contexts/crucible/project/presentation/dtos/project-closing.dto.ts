import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { ProjectRevisionDto } from './project-revision.dto';

export class ProjectClosingDto extends ProjectRevisionDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Tối đa 2000 ký tự sau trim; chuỗi rỗng = không có ghi chú',
  })
  @IsOptional()
  @IsString()
  readonly closingNote?: string | null;
}
