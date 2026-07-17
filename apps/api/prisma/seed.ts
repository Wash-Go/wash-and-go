import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/*
 * Weekend-MVP seed: one coverage area's worth of data to exercise the
 * express-lite slice end to end. Rates are PROPOSED/indicative (no founder
 * rate card yet). Idempotent via upserts so re-running is safe.
 */
async function main() {
  // Services (catalogue)
  const services = [
    { code: 'WDF', name: 'Wash, Dry & Fold', billingUnit: 'PER_KG' as const },
    { code: 'WDF_IRON', name: 'Wash + Iron', billingUnit: 'PER_KG' as const },
    { code: 'DRY_CLEAN', name: 'Dry Cleaning', billingUnit: 'PER_PIECE' as const },
  ];
  for (const s of services) {
    await prisma.serviceCatalogItem.upsert({
      where: { code: s.code },
      create: s,
      update: { name: s.name, billingUnit: s.billingUnit },
    });
  }
  const wdf = await prisma.serviceCatalogItem.findUniqueOrThrow({ where: { code: 'WDF' } });

  // Two partner shops with express capacity
  const shopSeeds = [
    { name: 'Tetuan Laundry Hub', address: 'Tetuan, Zamboanga City', lat: 6.9111, lng: 122.0794, expressSlotsPerDay: 8 },
    { name: 'Guiwan Wash Center', address: 'Guiwan, Zamboanga City', lat: 6.9245, lng: 122.0865, expressSlotsPerDay: 5 },
  ];
  for (const shop of shopSeeds) {
    const existing = await prisma.shop.findFirst({ where: { name: shop.name } });
    const row = existing
      ? await prisma.shop.update({ where: { id: existing.id }, data: shop })
      : await prisma.shop.create({ data: shop });
    // Give each shop a WDF rate (indicative ~PHP 25/kg)
    await prisma.shopService.upsert({
      where: { shopId_serviceId: { shopId: row.id, serviceId: wdf.id } },
      create: { shopId: row.id, serviceId: wdf.id, ratePhp: new Prisma.Decimal('25.00'), turnaroundHours: 24 },
      update: { ratePhp: new Prisma.Decimal('25.00'), turnaroundHours: 24 },
    });
  }

  // Test users: one customer, two riders (dev-bypass uses firebaseUid as x-dev-uid)
  const users = [
    { firebaseUid: 'dev-customer', phone: '+639170000001', displayName: 'Test Customer', roles: ['CUSTOMER'] as const },
    { firebaseUid: 'dev-rider-1', phone: '+639170000002', displayName: 'Rider One', roles: ['RIDER'] as const },
    { firebaseUid: 'dev-rider-2', phone: '+639170000003', displayName: 'Rider Two', roles: ['RIDER'] as const },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { firebaseUid: u.firebaseUid },
      create: { ...u, roles: [...u.roles] },
      update: { phone: u.phone, displayName: u.displayName, roles: [...u.roles] },
    });
  }

  console.log('Seed complete: 3 services, 2 shops (+express slots), 3 users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
