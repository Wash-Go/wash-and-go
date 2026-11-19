import { ApiProperty } from '@nestjs/swagger';

// GET /uploads/status response.
export class UploadsStatusDoc {
  @ApiProperty({ description: 'True when every R2_* env var is set' })
  configured!: boolean;
}
