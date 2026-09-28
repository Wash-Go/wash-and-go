import type { Notification } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import type { NotificationsRepository } from './notifications.repository';

const notif = (over: Partial<Notification> = {}): Notification =>
  ({
    id: 'n1',
    userId: 'u1',
    type: 'ORDER_UPDATE',
    title: 'Order WG-1',
    body: 'Your laundry was delivered',
    orderId: 'o1',
    readAt: null,
    createdAt: new Date('2026-07-24T00:00:00Z'),
    ...over,
  }) as Notification;

describe('NotificationsService', () => {
  let repo: jest.Mocked<NotificationsRepository>;
  let service: NotificationsService;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      list: jest.fn(),
      countUnread: jest.fn(),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
    } as unknown as jest.Mocked<NotificationsRepository>;
    service = new NotificationsService(repo);
  });

  it('lists shaped notifications with the unread count', async () => {
    repo.list.mockResolvedValue([notif(), notif({ id: 'n2', readAt: new Date() })]);
    repo.countUnread.mockResolvedValue(1);
    const out = await service.list('u1');
    expect(out.unread).toBe(1);
    expect(out.items).toHaveLength(2);
    expect(out.items[0]).toMatchObject({ id: 'n1', orderId: 'o1', readAt: null });
    expect(out.items[1].readAt).not.toBeNull();
  });

  it('marks one read (scoped to the user)', async () => {
    repo.markRead.mockResolvedValue({ count: 1 });
    await service.markRead('u1', 'n1');
    expect(repo.markRead).toHaveBeenCalledWith('u1', 'n1');
  });

  it('marks all read', async () => {
    repo.markAllRead.mockResolvedValue({ count: 3 });
    await service.markAllRead('u1');
    expect(repo.markAllRead).toHaveBeenCalledWith('u1');
  });
});
