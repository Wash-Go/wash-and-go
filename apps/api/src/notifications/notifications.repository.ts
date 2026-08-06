import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Emitted inside another domain's transaction (e.g. an order status change).
  create(
    tx: Prisma.TransactionClient,
    data: Prisma.NotificationUncheckedCreateInput,
  ): Promise<Notification> {
    return tx.notification.create({ data });
  }

  list(userId: string, take = 50): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  // Ownership-scoped: the userId guard means a user can only mark their own read.
  markRead(userId: string, id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markAllRead(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
