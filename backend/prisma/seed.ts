import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.token.deleteMany({});
  await prisma.queue.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // 1. Create Default Pre-Seeded Accounts
  const adminUser = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'admin@rugas.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const leadUser = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'lead@rugas.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      name: 'David K. Miller',
      email: 'manager@rugas.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'staff@rugas.com',
      password: hashedPassword,
      role: 'STAFF',
    },
  });

  console.log('👤 Created Pre-seeded Accounts:');
  console.log('   - Admin: admin@rugas.com');
  console.log('   - Lead: lead@rugas.com');
  console.log('   - Manager: manager@rugas.com');
  console.log('   - Staff: staff@rugas.com');

  // 2. Create Realistic Queues
  const vipQueue = await prisma.queue.create({
    data: {
      name: 'VIP Wealth & Premier Desk',
      description: 'Exclusive consultation desk for premier and corporate clients',
      prefix: 'VIP',
      color: '#8B5CF6', // Vibrant Violet
      icon: 'crown',
      status: 'ACTIVE',
      targetServiceTime: 8,
      counterName: 'Executive Suite 1',
      managerId: adminUser.id,
    },
  });

  const supportQueue = await prisma.queue.create({
    data: {
      name: 'Customer Support & Inquiries',
      description: 'General inquiries, account assistance, and technical escalations',
      prefix: 'CS',
      color: '#3B82F6', // Electric Blue
      icon: 'headphones',
      status: 'ACTIVE',
      targetServiceTime: 5,
      counterName: 'Desk 2',
      managerId: leadUser.id,
    },
  });

  const billingQueue = await prisma.queue.create({
    data: {
      name: 'Express Billing & Cashier',
      description: 'Quick payments, deposits, withdrawals and receipt processing',
      prefix: 'EXP',
      color: '#10B981', // Emerald Green
      icon: 'zap',
      status: 'ACTIVE',
      targetServiceTime: 3,
      counterName: 'Counter 3',
      managerId: managerUser.id,
    },
  });

  const pharmacyQueue = await prisma.queue.create({
    data: {
      name: 'Pharmacy & Prescription Dispense',
      description: 'Medication fulfillment and pharmacist dosage consultation',
      prefix: 'RX',
      color: '#EC4899', // Pink / Rose
      icon: 'activity',
      status: 'ACTIVE',
      targetServiceTime: 6,
      counterName: 'Window A',
      managerId: managerUser.id,
    },
  });

  console.log('📋 Created Queues: VIP, Support, Billing, Pharmacy');

  const now = new Date();

  // 3. Populate Support Queue with Active Waiting, Serving, and Historical tokens
  // Currently Serving
  await prisma.token.create({
    data: {
      tokenNumber: 'CS-004',
      sequenceNumber: 4,
      customerName: 'Marcus Aurelius Vance',
      customerPhone: '+1 (555) 234-8901',
      customerEmail: 'marcus.v@example.com',
      priority: 'VIP',
      notes: 'Transfer limits inquiry and document verification',
      status: 'SERVING',
      position: 0,
      counterName: 'Desk 2',
      servedById: leadUser.id,
      createdAt: new Date(now.getTime() - 14 * 60 * 1000), // 14 mins ago
      servedAt: new Date(now.getTime() - 4 * 60 * 1000), // 4 mins ago
      waitTimeSeconds: 600, // 10 mins wait
      queueId: supportQueue.id,
    },
  });

  // Waiting Tokens (in strict positions 1, 2, 3, 4, 5)
  const waitingSupport = [
    {
      seq: 5,
      name: 'Elena Rostova',
      phone: '+1 (555) 345-6789',
      priority: 'PRIORITY',
      notes: 'Urgent PIN reset and card activation',
      minsAgo: 10,
    },
    {
      seq: 6,
      name: 'Liam Chen',
      phone: '+1 (555) 456-7890',
      priority: 'NORMAL',
      notes: 'Address update and statement request',
      minsAgo: 8,
    },
    {
      seq: 7,
      name: 'Sophia Patel',
      phone: '+1 (555) 567-8901',
      priority: 'NORMAL',
      notes: 'Wire transfer confirmation',
      minsAgo: 6,
    },
    {
      seq: 8,
      name: 'David K. Miller',
      phone: '+1 (555) 678-9012',
      priority: 'VIP',
      notes: 'Portfolio review consultation',
      minsAgo: 3,
    },
    {
      seq: 9,
      name: 'Aisha Al-Mansoor',
      phone: '+1 (555) 789-0123',
      priority: 'NORMAL',
      notes: 'Loan repayment schedule inquiry',
      minsAgo: 1,
    },
  ];

  for (let i = 0; i < waitingSupport.length; i++) {
    const item = waitingSupport[i];
    await prisma.token.create({
      data: {
        tokenNumber: `CS-${String(item.seq).padStart(3, '0')}`,
        sequenceNumber: item.seq,
        customerName: item.name,
        customerPhone: item.phone,
        priority: item.priority,
        notes: item.notes,
        status: 'WAITING',
        position: i + 1,
        createdAt: new Date(now.getTime() - item.minsAgo * 60 * 1000),
        queueId: supportQueue.id,
      },
    });
  }

  // Completed Historical Tokens for Support Queue (gives instant rich analytics!)
  const completedSupport = [
    { seq: 1, name: 'Jonathan Brand', waitSec: 240, servSec: 320, hoursAgo: 3.5 },
    { seq: 2, name: 'Clara Oswald', waitSec: 360, servSec: 410, hoursAgo: 2.8 },
    { seq: 3, name: 'Gabriel Santana', waitSec: 180, servSec: 290, hoursAgo: 1.5 },
  ];

  for (const item of completedSupport) {
    const created = new Date(now.getTime() - item.hoursAgo * 60 * 60 * 1000);
    const served = new Date(created.getTime() + item.waitSec * 1000);
    const completed = new Date(served.getTime() + item.servSec * 1000);

    await prisma.token.create({
      data: {
        tokenNumber: `CS-${String(item.seq).padStart(3, '0')}`,
        sequenceNumber: item.seq,
        customerName: item.name,
        status: 'COMPLETED',
        position: 0,
        counterName: 'Desk 2',
        servedById: leadUser.id,
        createdAt: created,
        servedAt: served,
        completedAt: completed,
        waitTimeSeconds: item.waitSec,
        serviceTimeSeconds: item.servSec,
        queueId: supportQueue.id,
      },
    });
  }

  // Cancelled Token example
  await prisma.token.create({
    data: {
      tokenNumber: 'CS-000',
      sequenceNumber: 0,
      customerName: 'Robert Langdon',
      status: 'CANCELLED',
      position: 0,
      cancellationReason: 'Customer had flight departure',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      cancelledAt: new Date(now.getTime() - 3.8 * 60 * 60 * 1000),
      queueId: supportQueue.id,
    },
  });

  // 4. Populate VIP Queue
  await prisma.token.create({
    data: {
      tokenNumber: 'VIP-001',
      sequenceNumber: 1,
      customerName: 'Duchess Victoria Sterling',
      customerPhone: '+1 (555) 999-0001',
      priority: 'VIP',
      notes: 'Private trust setup and offshore structuring',
      status: 'SERVING',
      position: 0,
      counterName: 'Executive Suite 1',
      servedById: adminUser.id,
      createdAt: new Date(now.getTime() - 25 * 60 * 1000),
      servedAt: new Date(now.getTime() - 6 * 60 * 1000),
      waitTimeSeconds: 1140,
      queueId: vipQueue.id,
    },
  });

  await prisma.token.create({
    data: {
      tokenNumber: 'VIP-002',
      sequenceNumber: 2,
      customerName: 'Lord Harrison Blake',
      customerPhone: '+1 (555) 999-0002',
      priority: 'VIP',
      notes: 'Commercial real estate loan closure',
      status: 'WAITING',
      position: 1,
      createdAt: new Date(now.getTime() - 15 * 60 * 1000),
      queueId: vipQueue.id,
    },
  });

  await prisma.token.create({
    data: {
      tokenNumber: 'VIP-003',
      sequenceNumber: 3,
      customerName: 'Dr. Evelyn Wright',
      customerPhone: '+1 (555) 999-0003',
      priority: 'VIP',
      notes: 'Endowment fund management',
      status: 'WAITING',
      position: 2,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      queueId: vipQueue.id,
    },
  });

  // 5. Populate Billing Queue
  const billingTokens = [
    { seq: 1, name: 'Mateo Rossi', priority: 'NORMAL', status: 'WAITING', pos: 1 },
    { seq: 2, name: 'Zoe Kravitz', priority: 'PRIORITY', status: 'WAITING', pos: 2 },
    { seq: 3, name: 'Lucas Scott', priority: 'NORMAL', status: 'WAITING', pos: 3 },
  ];

  for (const bt of billingTokens) {
    await prisma.token.create({
      data: {
        tokenNumber: `EXP-${String(bt.seq).padStart(3, '0')}`,
        sequenceNumber: bt.seq,
        customerName: bt.name,
        priority: bt.priority,
        status: bt.status,
        position: bt.pos,
        createdAt: new Date(now.getTime() - bt.pos * 4 * 60 * 1000),
        queueId: billingQueue.id,
      },
    });
  }

  // 6. Generate random realistic historical completions over the past 3 days for analytics
  const randomNames = [
    'Benjamin Cruz', 'Hannah Abbott', 'Trevor Noah', 'Grace Hopper',
    'Ada Lovelace', 'Alan Turing', 'Margaret Hamilton', 'Claude Shannon',
    'Katherine Johnson', 'Linus Torvalds', 'Tim Berners-Lee', 'Barbara Liskov'
  ];

  for (let i = 0; i < randomNames.length; i++) {
    const hoursAgo = Math.random() * 48 + 1; // within last 48 hours
    const waitSec = Math.floor(Math.random() * 400 + 120); // 2 to 8 mins
    const servSec = Math.floor(Math.random() * 350 + 100); // 1.5 to 7 mins
    const created = new Date(now.getTime() - hoursAgo * 3600 * 1000);
    const served = new Date(created.getTime() + waitSec * 1000);
    const completed = new Date(served.getTime() + servSec * 1000);

    const q = i % 2 === 0 ? supportQueue : (i % 3 === 0 ? billingQueue : vipQueue);

    await prisma.token.create({
      data: {
        tokenNumber: `${q.prefix}-H${String(i + 10).padStart(3, '0')}`,
        sequenceNumber: i + 100,
        customerName: randomNames[i],
        priority: i % 4 === 0 ? 'VIP' : (i % 3 === 0 ? 'PRIORITY' : 'NORMAL'),
        status: 'COMPLETED',
        position: 0,
        counterName: q.counterName,
        createdAt: created,
        servedAt: served,
        completedAt: completed,
        waitTimeSeconds: waitSec,
        serviceTimeSeconds: servSec,
        queueId: q.id,
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('🔑 Credentials to log in:');
  console.log('   Email: admin@rugas.com');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

