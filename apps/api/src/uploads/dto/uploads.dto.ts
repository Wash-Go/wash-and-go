import { IsIn, IsString } from 'class-validator';

// Only these types can be uploaded (proof photos + permit PDFs). The service
// maps each to a file extension for the object key.
export class PresignUploadDto {
  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  contentType!: string;
}
