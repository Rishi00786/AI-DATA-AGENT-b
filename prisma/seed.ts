import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Utility function to generate random number between min and max
const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Utility function to generate a random date within the last n years
const randomDate = (yearsBack: number) => {
  const date = new Date();
  const past = date.getFullYear() - yearsBack;
  date.setFullYear(past + randomInt(0, yearsBack));
  date.setMonth(randomInt(0, 11));
  date.setDate(randomInt(1, 28));
  return date;
};

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.salesPerformance.deleteMany({});
  await prisma.financialMetrics.deleteMany({});
  await prisma.region.deleteMany({});

  console.log('Database cleaned, starting to seed data...');

  // Seed Regions
  const regions = [
    { name: 'North America', country: 'USA' },
    { name: 'Europe', country: 'Germany' },
    { name: 'Asia Pacific', country: 'Japan' },
    { name: 'South America', country: 'Brazil' },
    { name: 'Africa', country: 'South Africa' },
  ];

  for (const region of regions) {
    await prisma.region.create({
      data: region,
    });
  }

  console.log('Regions seeded...');

  // Seed Categories
  const categories = [
    { name: 'Electronics', description: 'Electronic devices and accessories' },
    { name: 'Clothing', description: 'Apparel and fashion items' },
    { name: 'Home Goods', description: 'Products for home and living' },
    { name: 'Sports', description: 'Sports equipment and gear' },
    { name: 'Beauty', description: 'Beauty and personal care products' },
  ];

  for (const category of categories) {
    await prisma.category.create({
      data: category,
    });
  }

  console.log('Categories seeded...');

  // Seed Departments
  const departments = [
    {
      name: 'Sales',
      description: 'Sales and business development',
      budget: 500000,
    },
    {
      name: 'Marketing',
      description: 'Marketing and advertising',
      budget: 350000,
    },
    {
      name: 'Engineering',
      description: 'Product development and engineering',
      budget: 750000,
    },
    {
      name: 'Customer Support',
      description: 'Customer service and support',
      budget: 300000,
    },
    {
      name: 'HR',
      description: 'Human resources and talent acquisition',
      budget: 200000,
    },
  ];

  for (const department of departments) {
    await prisma.department.create({
      data: department,
    });
  }

  console.log('Departments seeded...');

  // Seed Products
  const createdCategories = await prisma.category.findMany();

  for (let i = 0; i < 50; i++) {
    const price = parseFloat(faker.commerce.price({ min: 10, max: 1000 }));
    const cost = price * (0.4 + Math.random() * 0.3); // Cost is 40-70% of price

    await prisma.product.create({
      data: {
        sku: faker.string.uuid().substring(0, 8).toUpperCase(),
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price,
        cost,
        inventory: randomInt(0, 1000),
        categoryId:
          createdCategories[randomInt(0, createdCategories.length - 1)].id,
      },
    });
  }

  console.log('Products seeded...');

  // Seed Employees
  const createdDepartments = await prisma.department.findMany();

  for (let i = 0; i < 100; i++) {
    await prisma.employee.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        position: faker.person.jobTitle(),
        departmentId:
          createdDepartments[randomInt(0, createdDepartments.length - 1)].id,
        hireDate: randomDate(5),
        salary: randomInt(30000, 150000),
        isActive: Math.random() > 0.1, // 90% active
      },
    });
  }

  console.log('Employees seeded...');

  // Seed Customers
  const createdRegions = await prisma.region.findMany();

  for (let i = 0; i < 200; i++) {
    await prisma.customer.create({
      data: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: faker.location.country(),
        regionId: createdRegions[randomInt(0, createdRegions.length - 1)].id,
        lastPurchase: Math.random() > 0.3 ? randomDate(2) : null,
      },
    });
  }

  console.log('Customers seeded...');

  // Seed Orders and Order Items
  const createdCustomers = await prisma.customer.findMany();
  const createdProducts = await prisma.product.findMany();

  for (let i = 0; i < 500; i++) {
    // Create order
    const orderItems = randomInt(1, 5); // Random number of items per order
    let totalAmount = 0;
    const shippingCost = randomInt(5, 25);

    const order = await prisma.order.create({
      data: {
        customerId:
          createdCustomers[randomInt(0, createdCustomers.length - 1)].id,
        orderDate: randomDate(2),
        status: ['completed', 'pending', 'shipped', 'cancelled'][
          randomInt(0, 3)
        ],
        shippingCost,
        taxAmount: 0, // Will calculate below
        discount: Math.random() > 0.7 ? randomInt(5, 50) : 0,
        totalAmount: 0, // Will update after creating items
      },
    });

    // Create order items
    for (let j = 0; j < orderItems; j++) {
      const product = createdProducts[randomInt(0, createdProducts.length - 1)];
      const quantity = randomInt(1, 5);
      const unitPrice = product.price;
      const discount = Math.random() > 0.8 ? product.price * 0.1 : 0;
      const subtotal = unitPrice * quantity - discount;

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity,
          unitPrice,
          discount,
          subtotal,
        },
      });

      totalAmount += subtotal;
    }

    // Calculate tax and update order total
    const taxAmount = totalAmount * 0.07; // 7% tax
    totalAmount += taxAmount + shippingCost;

    // Update order with calculated values
    await prisma.order.update({
      where: { id: order.id },
      data: {
        taxAmount,
        totalAmount,
      },
    });
  }

  console.log('Orders and Order Items seeded...');

  // Seed Marketing Campaigns
  for (let i = 0; i < 20; i++) {
    const budget = randomInt(10000, 100000);
    const spend = budget * (Math.random() * 0.9 + 0.1); // 10-100% of budget
    const leads = randomInt(50, 5000);
    const conversions = Math.floor(leads * (Math.random() * 0.5)); // 0-50% conversion rate
    const revenue = conversions * randomInt(100, 500);

    await prisma.campaign.create({
      data: {
        name: `Campaign ${i + 1}: ${faker.company.catchPhrase()}`,
        description: faker.company.catchPhrase(),
        startDate: randomDate(2),
        endDate: Math.random() > 0.3 ? randomDate(1) : null, // 70% have end date
        budget,
        spend,
        platform: [
          'Social Media',
          'Email',
          'Search',
          'Display',
          'TV',
          'Radio',
          'Print',
        ][randomInt(0, 6)],
        target: [
          'New Customers',
          'Existing Customers',
          'Lapsed Customers',
          'All',
        ][randomInt(0, 3)],
        leads,
        conversions,
        revenue,
      },
    });
  }

  console.log('Marketing Campaigns seeded...');

  // Seed Sales Performance
  for (const region of createdRegions) {
    for (const category of createdCategories) {
      // Generate monthly data for the past 2 years
      for (let i = 0; i < 24; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        date.setDate(1); // First day of month

        const targetSales = randomInt(10000, 100000);
        const performance = Math.random() * 0.5 + 0.75; // 75-125% of target

        await prisma.salesPerformance.create({
          data: {
            date,
            regionId: region.id,
            categoryId: category.id,
            revenue: Math.round(targetSales * performance),
            targetSales,
          },
        });
      }
    }
  }

  console.log('Sales Performance data seeded...');

  // Seed Financial Metrics
  for (let i = 0; i < 36; i++) {
    // 3 years of monthly data
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1); // First day of month

    const revenue = randomInt(500000, 2000000);
    const expenses = revenue * (Math.random() * 0.3 + 0.5); // 50-80% of revenue
    const profit = revenue - expenses;
    const cashflow = profit * (Math.random() * 0.5 + 0.7); // 70-120% of profit

    // Compounding assets, liabilities, and equity
    const month = i % 12;
    const year = Math.floor(i / 12);

    const baseAssets = 5000000 - year * 500000;
    const assets = baseAssets + month * 100000 + randomInt(-200000, 200000);
    const liabilities = assets * (Math.random() * 0.3 + 0.3); // 30-60% of assets
    const equityValue = assets - liabilities;

    await prisma.financialMetrics.create({
      data: {
        date,
        revenue,
        expenses,
        profit,
        cashflow,
        assets,
        liabilities,
        equityValue,
      },
    });
  }

  console.log('Financial Metrics seeded...');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
