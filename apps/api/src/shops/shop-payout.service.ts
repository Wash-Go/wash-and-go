import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhMobile, PHONE_SEPARATORS } from '../users/phone';
import type { PutPayoutAccountDto } from './dto/shop-payout.dto';
import { ShopAccessService } from './shop-access.service';
import { type PayoutAccountView, payoutView } from './shop-payout';

const BANK_ACCOUNT = /^\d{6,20}$/;

/*
 * The shop's payout account (portal B4). OWNER only. The number is stored in
 * full (remittance needs it) and never returned — responses carry the masked
 * view, and no error message or log line includes it. Founder policy (GCash
 * vs bank) is pending, so both are accepted and none is mandatory yet. There
 * is no notification system for this change yet; the audit trail is the
 * structured log line.
 */
@Injectable()
export class ShopPayoutService {
  private readonly logger = new Logger('ShopPayout');

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ShopAccessService,
  ) {}

  async put(userId: string, dto: PutPayoutAccountDto): Promise<PayoutAccountView> {
    const { shopId } = await this.access.ownerMembership(userId, 'change the payout account');
    const accountName = dto.accountName.trim();
    if (!accountName) throw new BadRequestException('Enter the account holder’s name');

    let accountNumber: string;
    let bankName: string | null;
    if (dto.method === 'GCASH') {
      if (dto.bankName != null) {
        throw new BadRequestException('A GCash account has no bank name');
      }
      const mobile = normalizePhMobile(dto.accountNumber);
      if (!mobile) {
        throw new BadRequestException('Enter the GCash mobile number, e.g. 0917 123 4567');
      }
      accountNumber = mobile;
      bankName = null;
    } else {
      const digits = dto.accountNumber.replace(PHONE_SEPARATORS, '');
      if (!BANK_ACCOUNT.test(digits)) {
        throw new BadRequestException('A bank account number is 6 to 20 digits');
      }
      const bank = dto.bankName?.trim();
      if (!bank) throw new BadRequestException('Enter the bank name');
      accountNumber = digits;
      bankName = bank;
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        payoutMethod: dto.method,
        payoutAccountName: accountName,
        payoutAccountNumber: accountNumber,
        payoutBankName: bankName,
        payoutUpdatedAt: new Date(),
      },
    });
    this.logger.log({ event: 'shop.payout_account.updated', shopId, userId, method: dto.method });
    return payoutView(updated) as PayoutAccountView;
  }

  async remove(userId: string): Promise<void> {
    const { shopId } = await this.access.ownerMembership(userId, 'change the payout account');
    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        payoutMethod: null,
        payoutAccountName: null,
        payoutAccountNumber: null,
        payoutBankName: null,
        payoutUpdatedAt: null,
      },
    });
    this.logger.log({ event: 'shop.payout_account.removed', shopId, userId });
  }
}
