const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed dummy data process...');

  // 1. Fetch super admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@soryouth.com' }
  });

  if (!adminUser) {
    console.error('Super admin user (admin@soryouth.com) not found! Please run node seed-admin.js first.');
    process.exit(1);
  }

  console.log('Clearing existing CRM data (except super admin)...');
  await prisma.ticket.deleteMany({});
  await prisma.generalTask.deleteMany({});
  await prisma.followUp.deleteMany({});
  await prisma.siteSurvey.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.droppedLead.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.customSetting.deleteMany({
    where: {
      NOT: {
        type: 'USER_ROLE',
        name: 'Admin'
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      NOT: {
        email: 'admin@soryouth.com'
      }
    }
  });

  console.log('Inserting Custom Settings...');
  
  // CustomSetting Types
  const leadStatuses = ['Fresher', 'Requirement', 'Quotation', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const leadSources = ['Facebook', 'Google', 'Referral', 'Website', 'LinkedIn', 'Cold Call'];
  const clientStatuses = ['Fresher', 'Active', 'Installer', 'Completed', 'Deal Done'];
  const userRoles = ['Admin', 'TechnoSales', 'Designing', 'Procurement', 'ProjectManager', 'LiasoningExecutive', 'OperationAndMaintainance'];
  
  const statusRecords = [];
  const sourceRecords = [];
  const clientStatusRecords = [];

  for (const name of leadStatuses) {
    const s = await prisma.customSetting.create({
      data: { type: 'LEAD_STATUS', name }
    });
    statusRecords.push(s);
  }

  for (const name of leadSources) {
    const s = await prisma.customSetting.create({
      data: { type: 'LEAD_SOURCE', name }
    });
    sourceRecords.push(s);
  }

  for (const name of clientStatuses) {
    const s = await prisma.customSetting.create({
      data: { type: 'CLIENT_STATUS', name }
    });
    clientStatusRecords.push(s);
  }

  for (const name of userRoles) {
    if (name !== 'Admin') {
      await prisma.customSetting.create({
        data: { type: 'USER_ROLE', name }
      });
    }
  }

  console.log('Hashing passwords for users...');
  const salt = await bcrypt.genSalt(10);
  const userPassword = await bcrypt.hash('password123', salt);

  console.log('Creating Sales & Project Users...');
  const mayur = await prisma.user.create({
    data: {
      name: 'Mayur',
      email: 'mayur@soryouth.com',
      phone: '9823000001',
      password: userPassword,
      role: 'TechnoSales',
      isActive: true,
      viewPermission: 'ALL'
    }
  });

  const salesA = await prisma.user.create({
    data: {
      name: 'Sales Rep A',
      email: 'salesa@soryouth.com',
      phone: '9823000002',
      password: userPassword,
      role: 'TechnoSales',
      isActive: true,
      viewPermission: 'ASSIGNED'
    }
  });

  const salesB = await prisma.user.create({
    data: {
      name: 'Sales Rep B',
      email: 'salesb@soryouth.com',
      phone: '9823000003',
      password: userPassword,
      role: 'TechnoSales',
      isActive: true,
      viewPermission: 'ASSIGNED'
    }
  });

  const kanchan = await prisma.user.create({
    data: {
      name: 'Kanchan Nikam',
      email: 'kanchan@soryouth.com',
      phone: '9823000004',
      password: userPassword,
      role: 'Designing',
      isActive: true,
      viewPermission: 'ALL'
    }
  });

  const prasad = await prisma.user.create({
    data: {
      name: 'Prasad mudholkar',
      email: 'prasad@soryouth.com',
      phone: '9823000005',
      password: userPassword,
      role: 'ProjectManager',
      isActive: true,
      viewPermission: 'ALL'
    }
  });

  const ritesh = await prisma.user.create({
    data: {
      name: 'Ritesh',
      email: 'ritesh@soryouth.com',
      phone: '9823000006',
      password: userPassword,
      role: 'Procurement',
      isActive: true,
      viewPermission: 'ALL'
    }
  });

  console.log('Creating Leads...');
  const now = new Date();
  
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Pramod Agrawal',
      email: 'pramod.agrawal@example.com',
      phone: '6263537508',
      status: 'Fresher',
      source: 'Facebook',
      kilowatt: 10.0,
      address: '123 Main St, Nagpur',
      priority: 'High',
      clientType: 'Commercial',
      createdById: adminUser.id,
      assignedToId: mayur.id,
      lastCommentText: 'Interested in commercial solar. Requested pricing.',
      lastCommentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      nextFollowUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      nextFollowUpTime: '10:00',
      followUpCount: 1
    }
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: 'Jane Smith',
      email: 'jane.smith.lead@example.com',
      phone: '7001173134',
      status: 'Requirement',
      source: 'Google',
      kilowatt: 5.0,
      address: '456 Oak Ave, Mumbai',
      priority: 'Medium',
      clientType: 'Individual/Bungalow',
      createdById: mayur.id,
      assignedToId: salesA.id,
      lastCommentText: 'Bungalow owner. Looking for 5kW off-grid system.',
      lastCommentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      nextFollowUpTime: '14:30',
      followUpCount: 2
    }
  });

  const lead3 = await prisma.lead.create({
    data: {
      name: 'Ramesh Kumar',
      email: 'ramesh.k@example.com',
      phone: '9876500001',
      status: 'Quotation',
      source: 'Referral',
      kilowatt: 8.0,
      address: '789 Pine Rd, Pune',
      priority: 'Hot',
      clientType: 'Commercial',
      createdById: adminUser.id,
      assignedToId: salesB.id,
      lastCommentText: 'Quotation sent. Customer is reviewing structure cost.',
      lastCommentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      nextFollowUpTime: '11:00',
      followUpCount: 3
    }
  });

  const lead4 = await prisma.lead.create({
    data: {
      name: 'Suresh Patil',
      email: 'suresh.patil@example.com',
      phone: '9876500002',
      status: 'Negotiation',
      source: 'Website',
      kilowatt: 15.0,
      address: '101 Maple Dr, Nashik',
      priority: 'Low',
      clientType: 'Industrial',
      createdById: mayur.id,
      assignedToId: mayur.id,
      lastCommentText: 'Discussing discount on inverter. Meeting scheduled.',
      lastCommentDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      nextFollowUpTime: '16:00',
      followUpCount: 4
    }
  });

  console.log('Creating Lead Activities/FollowUps...');
  await prisma.followUp.createMany({
    data: [
      {
        leadId: lead1.id,
        type: 'Call',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Interested in commercial solar. Requested pricing.',
        followupOrTask: 'Followup',
        createdById: adminUser.id
      },
      {
        leadId: lead2.id,
        type: 'Call',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'Not connected',
        comment: 'Tried calling. Number busy.',
        followupOrTask: 'Followup',
        createdById: mayur.id
      },
      {
        leadId: lead2.id,
        type: 'Call',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Bungalow owner. Looking for 5kW off-grid system.',
        followupOrTask: 'Followup',
        createdById: mayur.id
      },
      {
        leadId: lead3.id,
        type: 'Call',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'First call done, requested site details.',
        followupOrTask: 'Followup',
        createdById: salesB.id
      },
      {
        leadId: lead3.id,
        type: 'Visit',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Site visit completed. Feasibility is OK.',
        followupOrTask: 'Followup',
        createdById: salesB.id
      },
      // Tasks
      {
        leadId: lead1.id,
        type: 'Call',
        date: new Date(),
        status: 'Answered',
        comment: 'Follow up on commercial quotation sent.',
        followupOrTask: 'Task',
        taskDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        taskTime: '10:00',
        taskStatus: 'Open',
        createdById: adminUser.id,
        taskForUserId: mayur.id
      },
      {
        leadId: lead2.id,
        type: 'Meeting',
        date: new Date(),
        status: 'Answered',
        comment: 'Discuss off-grid battery backup options.',
        followupOrTask: 'Task',
        taskDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        taskTime: '14:30',
        taskStatus: 'Open',
        createdById: mayur.id,
        taskForUserId: salesA.id
      }
    ]
  });

  console.log('Creating Clients...');
  const client1 = await prisma.client.create({
    data: {
      name: 'Green Valley Society',
      email: 'greenvalley@society.com',
      phone: '9876543215',
      status: 'Deal Done',
      clientType: 'Housing Society',
      kilowatt: 50.0,
      address: 'Sector 5, Kharghar, Navi Mumbai',
      priority: 'Hot',
      totalDealValue: 2500000.00,
      createdById: adminUser.id,
      assignedToId: mayur.id,
      lastCommentText: 'Agreement signed. Advance payment received.',
      lastCommentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      nextFollowUpTime: '12:00',
      followUpCount: 5
    }
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'Anil Patel',
      email: 'anil.patel@bungalow.com',
      phone: '9876543216',
      status: 'Active',
      clientType: 'Individual/Bungalow',
      kilowatt: 7.0,
      address: 'Bungalow 4, Aundh, Pune',
      priority: 'Average',
      totalDealValue: 350000.00,
      createdById: adminUser.id,
      assignedToId: salesA.id,
      lastCommentText: 'Design drawings in progress.',
      lastCommentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      nextFollowUpTime: '11:00',
      followUpCount: 3
    }
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'FutureTech Industries',
      email: 'contact@futuretechind.com',
      phone: '9876543217',
      status: 'Installer',
      clientType: 'Industrial',
      kilowatt: 100.0,
      address: 'MIDC Area, Bhosari, Pune',
      priority: 'Hot',
      totalDealValue: 4500000.00,
      createdById: adminUser.id,
      assignedToId: salesB.id,
      lastCommentText: 'Structure fabrication under review.',
      lastCommentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      nextFollowUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      nextFollowUpTime: '15:00',
      followUpCount: 6
    }
  });

  const client4 = await prisma.client.create({
    data: {
      name: 'Apex Mall',
      email: 'info@apexmall.com',
      phone: '9876543218',
      status: 'Completed',
      clientType: 'Commercial',
      kilowatt: 120.0,
      address: 'Vashi Station Road, Navi Mumbai',
      priority: 'Hot',
      totalDealValue: 5500000.00,
      createdById: adminUser.id,
      assignedToId: mayur.id,
      lastCommentText: 'System commissioned. Net meter installed.',
      lastCommentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      followUpCount: 8
    }
  });

  console.log('Creating Client Activities...');
  await prisma.followUp.createMany({
    data: [
      {
        clientId: client1.id,
        type: 'Meeting',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Kickoff meeting with committee. Drawings approved.',
        followupOrTask: 'Followup',
        createdById: adminUser.id
      },
      {
        clientId: client1.id,
        type: 'SMS',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Agreement copy shared via WhatsApp.',
        followupOrTask: 'Followup',
        createdById: mayur.id
      },
      {
        clientId: client2.id,
        type: 'Call',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'Answered',
        comment: 'Design team requires shadow analysis. Advised client.',
        followupOrTask: 'Followup',
        createdById: salesA.id
      }
    ]
  });

  console.log('Creating Deals...');
  // Deal stages: Solar PV Plant: ['Deal Done', 'Procurement', 'Installation', 'Commissioning', 'Handover', 'Completed']
  // Deal stages: AMC: ['New AMC', 'Quoted', 'Agreement', 'Active', 'Expired']
  const deal1 = await prisma.deal.create({
    data: {
      clientName: 'Green Valley Society',
      contactPerson: 'Secretary Sharma',
      email: 'greenvalley@society.com',
      phone: '9876543215',
      pipeline: 'Solar PV Plant',
      stage: 'Procurement',
      dealValue: 2500000.00,
      kilowatt: 50.0,
      poWoDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      clientId: client1.id,
      createdById: adminUser.id,
      assignedToId: mayur.id,
      notes: 'Procurement of Tier 1 TOPCon modules and Growatt inverter is ongoing.'
    }
  });

  const deal2 = await prisma.deal.create({
    data: {
      clientName: 'Anil Patel',
      contactPerson: 'Anil Patel',
      email: 'anil.patel@bungalow.com',
      phone: '9876543216',
      pipeline: 'Solar PV Plant',
      stage: 'Installation',
      dealValue: 350000.00,
      kilowatt: 7.0,
      poWoDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      clientId: client2.id,
      createdById: adminUser.id,
      assignedToId: salesA.id,
      notes: 'Structure installation complete. Module mounting to start tomorrow.'
    }
  });

  const deal3 = await prisma.deal.create({
    data: {
      clientName: 'FutureTech Industries',
      contactPerson: 'MD Joshi',
      email: 'contact@futuretechind.com',
      phone: '9876543217',
      pipeline: 'Solar PV Plant',
      stage: 'Commissioning',
      dealValue: 4500000.00,
      kilowatt: 100.0,
      poWoDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      clientId: client3.id,
      createdById: adminUser.id,
      assignedToId: salesB.id,
      notes: 'Physical installation complete. Awaiting DISCOM inspections.'
    }
  });

  const deal4 = await prisma.deal.create({
    data: {
      clientName: 'Apex Mall',
      contactPerson: 'Manager Sen',
      email: 'info@apexmall.com',
      phone: '9876543218',
      pipeline: 'Solar PV Plant',
      stage: 'Completed',
      dealValue: 5500000.00,
      kilowatt: 120.0,
      poWoDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      clientId: client4.id,
      createdById: adminUser.id,
      assignedToId: mayur.id,
      notes: 'Project fully completed and handed over.'
    }
  });

  const amcDeal = await prisma.deal.create({
    data: {
      clientName: 'Apex Mall',
      contactPerson: 'Manager Sen',
      email: 'info@apexmall.com',
      phone: '9876543218',
      pipeline: 'AMC',
      stage: 'Active',
      dealValue: 200000.00,
      kilowatt: 120.0,
      poWoDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      clientId: client4.id,
      createdById: adminUser.id,
      assignedToId: mayur.id,
      amcDurationInMonths: 12,
      amcEffectiveDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notes: 'First quarterly maintenance scheduled for next month.'
    }
  });

  console.log('Creating Site Surveys...');
  await prisma.siteSurvey.create({
    data: {
      consumerName: 'Green Valley Society',
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      consumerCategory: 'Housing Society',
      location: 'Sector 5, Kharghar, Navi Mumbai',
      numberOfMeters: 3,
      meterRating: '60A',
      meterPhase: 'Three Phase',
      electricityAmount: 45000.00,
      consumerLoadType: 'LT',
      roofType: 'RCC',
      buildingHeight: 'G+7',
      shadowFreeArea: '4000 sq ft',
      discom: 'MSEDCL',
      sanctionedLoad: '45kW',
      remark: 'Good south facing roof area. Elevated structure needed to clear lift machine room shadow.',
      clientId: client1.id,
      surveyorId: kanchan.id
    }
  });

  await prisma.siteSurvey.create({
    data: {
      consumerName: 'Anil Patel',
      date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      consumerCategory: 'Individual/Bungalow',
      location: 'Bungalow 4, Aundh, Pune',
      numberOfMeters: 1,
      meterRating: '30A',
      meterPhase: 'Three Phase',
      electricityAmount: 8000.00,
      consumerLoadType: 'LT',
      roofType: 'Metal',
      buildingHeight: 'G+2',
      shadowFreeArea: '800 sq ft',
      discom: 'MSEDCL',
      sanctionedLoad: '8kW',
      remark: 'Sloped metal roof. Normal rails will work.',
      clientId: client2.id,
      surveyorId: kanchan.id
    }
  });

  console.log('Creating General Tasks...');
  await prisma.generalTask.createMany({
    data: [
      {
        comment: 'Prepare SLD (Single Line Diagram) for Green Valley project.',
        taskDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'High',
        status: 'Pending',
        assignedToId: kanchan.id,
        createdById: mayur.id,
        dealId: deal1.id
      },
      {
        comment: 'Purchase rails and mid-clamps for Anil Patel structure.',
        taskDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Overdue
        priority: 'Medium',
        status: 'In Progress',
        assignedToId: ritesh.id,
        createdById: salesA.id,
        dealId: deal2.id
      },
      {
        comment: 'Schedule inspector visit for FutureTech test commissioning.',
        taskDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        priority: 'High',
        status: 'Pending',
        assignedToId: prasad.id,
        createdById: salesB.id,
        dealId: deal3.id
      }
    ]
  });

  console.log('Creating Tickets...');
  await prisma.ticket.createMany({
    data: [
      {
        clientName: 'Green Valley Society',
        mobileNo: '9876543215',
        email: 'greenvalley@society.com',
        address: 'Sector 5, Kharghar, Navi Mumbai',
        subject: 'Structure height query',
        description: 'Society committee asked why the height is 1.5m instead of 1.2m as verbally discussed.',
        status: 'Open',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        ticketFor: 'Green Valley 50kW PV',
        clientId: client1.id,
        dealId: deal1.id,
        createdById: mayur.id,
        assignedToId: prasad.id
      },
      {
        clientName: 'Anil Patel',
        mobileNo: '9876543216',
        email: 'anil.patel@bungalow.com',
        address: 'Bungalow 4, Aundh, Pune',
        subject: 'Slight scratching on 1 module frame',
        description: 'Client noticed frame scratches on one module. Requesting replacement or touch-up.',
        status: 'Open',
        priority: 'Low',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        ticketFor: 'Patil Bungalow 7kW',
        clientId: client2.id,
        dealId: deal2.id,
        createdById: salesA.id,
        assignedToId: ritesh.id
      }
    ]
  });

  console.log('Creating Expenses...');
  await prisma.expense.createMany({
    data: [
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        category: 'Travel',
        amount: 850.00,
        description: 'Auto & bus fare for Green Valley client site meeting.',
        status: 'Approved',
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        userId: mayur.id,
        reviewedById: adminUser.id
      },
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        category: 'Food',
        amount: 320.00,
        description: 'Lunch with surveyor during Patil Bungalow site survey.',
        status: 'Pending',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        userId: salesA.id
      },
      {
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        category: 'Supplies',
        amount: 1500.00,
        description: 'Safety helmets and vests purchased locally for site team.',
        status: 'Approved',
        submittedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        userId: prasad.id,
        reviewedById: adminUser.id
      }
    ]
  });

  console.log('Dummy data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding dummy data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
