import { Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { NotificationsRepository } from './notifications.repository';

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  // Emit within an existing transaction (called from the orders status tx so the
  // notification and the status change commit together).
  emit(
    tx: Prisma.TransactionClient,
    data: {
      userId: string;
      type: string;
      title: string;
      body: string;
      orderId?: string;
    },
  ): Promise<Notification> {
    return this.repo.create(tx, data);
  }

  async list(
    userId: string,
  ): Promise<{ items: NotificationView[]; unread: number }> {
    const [rows, unread] = await Promise.all([
      this.repo.list(userId),
      this.repo.countUnread(userId),
    ]);
    return { items: rows.map((n) => this.shape(n)), unread };
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.repo.markRead(userId, id);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.markAllRead(userId);
  }

  private shape(n: Notification): NotificationView {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      orderId: n.orderId,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
