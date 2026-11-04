import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { computeInvoiceTotals } from '../utils/decimal.js';

async function seed() {
  console.log('🌱 Starting database seeding for BizPilot AI...');

  // 1. Create Business User: Rajesh Kumar (TechNova Solutions)
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const businessUser = await prisma.user.upsert({
    where: { email: 'business@bizpilot.ai' },
    update: {},
    create: {
      name: 'Rajesh Kumar',
      email: 'business@bizpilot.ai',
      username: 'rajesh_tech',
      passwordHash,
      accountStatus: 'ACTIVE',
      profile: {
        create: {
          preferredLang: 'hinglish',
          theme: 'dark',
          phone: '+91 98765 43210',
        }
      },
      workspacesOwned: {
        create: {
          name: 'TechNova Solutions',
          slug: 'technova-solutions',
          currency: 'INR',
          businessProfile: {
            create: {
              businessName: 'TechNova Solutions Pvt Ltd',
              businessType: 'Agency',
              taxId: '29ABCDE1234F1Z5',
              addressLine1: 'Tech Park, Indiranagar',
              city: 'Bengaluru',
              state: 'Karnataka',
              country: 'India',
              postalCode: '560038',
              email: 'billing@technova.io',
              paymentInstructions: 'UPI ID: technova@upi or Netbanking: HDFC0001234 A/C 987654321',
            }
          }
        }
      }
    },
    include: {
      workspacesOwned: true,
    }
  });

  const workspace = businessUser.workspacesOwned[0];

  // Ensure workspace member role is OWNER
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: businessUser.id,
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: businessUser.id,
      role: 'OWNER',
    }
  });

  // 2. Create Client User: Rahul Sharma (Rahul Enterprises)
  const clientUser = await prisma.user.upsert({
    where: { email: 'rahul@rahulenterprises.com' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      email: 'rahul@rahulenterprises.com',
      username: 'rahul_sharma',
      passwordHash,
      accountStatus: 'ACTIVE',
      profile: {
        create: {
          preferredLang: 'hi',
          theme: 'dark',
          phone: '+91 91234 56789',
        }
      },
      workspacesOwned: {
        create: {
          name: 'Rahul Enterprises',
          slug: 'rahul-enterprises',
          currency: 'INR',
          businessProfile: {
            create: {
              businessName: 'Rahul Enterprises',
              businessType: 'Startup',
              city: 'Mumbai',
              state: 'Maharashtra',
              country: 'India',
            }
          }
        }
      }
    },
    include: {
      workspacesOwned: true,
    }
  });

  const clientWorkspace = clientUser.workspacesOwned[0];
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: clientWorkspace.id,
        userId: clientUser.id,
      }
    },
    update: {},
    create: {
      workspaceId: clientWorkspace.id,
      userId: clientUser.id,
      role: 'OWNER',
    }
  });

  // 3. Connect Rajesh and Rahul as ACCEPTED connection
  const connection = await prisma.connection.upsert({
    where: {
      senderId_receiverId: {
        senderId: businessUser.id,
        receiverId: clientUser.id,
      }
    },
    update: { status: 'ACCEPTED' },
    create: {
      senderId: businessUser.id,
      receiverId: clientUser.id,
      status: 'ACCEPTED',
      notes: 'Website and Mobile App Retainer Client',
    }
  });

  // 4. Initialize Sequence
  await prisma.invoiceSequence.upsert({
    where: {
      workspaceId_year_prefix: {
        workspaceId: workspace.id,
        year: 2026,
        prefix: 'INV',
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      year: 2026,
      prefix: 'INV',
      currentSeq: 2,
    }
  });

  // 5. Seed historical invoice: INV-2026-0001 (Paid last month)
  const pastItems = [
    { description: 'Cloud Infrastructure Setup & CI/CD Pipeline', quantity: 1, unitPrice: 35000 }
  ];
  const pastTotals = computeInvoiceTotals(pastItems, 18, 0, 41300);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);

  const invoice1 = await prisma.invoice.upsert({
    where: {
      workspaceId_invoiceNumber: {
        workspaceId: workspace.id,
        invoiceNumber: 'INV-2026-0001',
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      invoiceNumber: 'INV-2026-0001',
      clientId: clientUser.id,
      status: 'PAID',
      issueDate: pastDate,
      dueDate: new Date(pastDate.getTime() + 14 * 86400000),
      currency: 'INR',
      subtotal: pastTotals.subtotal,
      taxRate: pastTotals.taxRate,
      taxAmount: pastTotals.taxAmount,
      totalAmount: pastTotals.totalAmount,
      paidAmount: pastTotals.totalAmount,
      balanceDue: pastTotals.balanceDue,
      notes: 'Initial milestone delivery.',
      paidAt: pastDate,
      items: {
        create: pastTotals.processedItems,
      },
      events: {
        create: [
          { eventType: 'CREATED_AND_SENT', description: 'Invoice INV-2026-0001 created' },
          { eventType: 'PAYMENT_RECEIVED', description: 'Full payment of ₹41,300 received via Razorpay Sandbox' }
        ]
      }
    }
  });

  // Seed verified payment for invoice 1
  await prisma.payment.upsert({
    where: { providerPaymentId: 'pay_rzp_seed_0001' },
    update: {},
    create: {
      workspaceId: workspace.id,
      invoiceId: invoice1.id,
      clientId: clientUser.id,
      amount: pastTotals.totalAmount,
      currency: 'INR',
      status: 'SUCCEEDED',
      provider: 'RAZORPAY',
      providerPaymentId: 'pay_rzp_seed_0001',
      providerOrderId: 'order_rzp_seed_0001',
      paymentMethod: 'UPI',
      paymentDate: pastDate,
    }
  });

  // 6. Seed a pending invoice: INV-2026-0002 (Sent, due next week)
  const currentItems = [
    { description: 'Quarterly Maintenance & Bug Fixes', quantity: 1, unitPrice: 20000 }
  ];
  const currentTotals = computeInvoiceTotals(currentItems, 18, 0, 0);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  await prisma.invoice.upsert({
    where: {
      workspaceId_invoiceNumber: {
        workspaceId: workspace.id,
        invoiceNumber: 'INV-2026-0002',
      }
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      invoiceNumber: 'INV-2026-0002',
      clientId: clientUser.id,
      status: 'SENT',
      issueDate: new Date(),
      dueDate,
      currency: 'INR',
      subtotal: currentTotals.subtotal,
      taxRate: currentTotals.taxRate,
      taxAmount: currentTotals.taxAmount,
      totalAmount: currentTotals.totalAmount,
      paidAmount: currentTotals.paidAmount,
      balanceDue: currentTotals.balanceDue,
      notes: 'Quarterly support retainer.',
      items: {
        create: currentTotals.processedItems,
      },
      events: {
        create: [
          { eventType: 'CREATED_AND_SENT', description: 'Invoice INV-2026-0002 created and sent to Rahul Sharma' }
        ]
      }
    }
  });

  console.log('✅ Seeding completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Business Account: business@bizpilot.ai / Password@123 (TechNova Solutions - Rajesh Kumar)');
  console.log('  Client Account:   rahul@rahulenterprises.com / Password@123 (Rahul Enterprises - Rahul Sharma)');
}

seed()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
