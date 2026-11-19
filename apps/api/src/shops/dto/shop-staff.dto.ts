import { IsEmail, MaxLength } from 'class-validator';

// POST /shop/invites. Lowercased + trimmed in the service; the role is always
// STAFF (owners are not invited, they onboard).
export class CreateShopInviteDto {
  @IsEmail() @MaxLength(254) email!: string;
}
