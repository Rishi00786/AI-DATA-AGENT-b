// src/query/query.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAIService } from '../ai/openai.service';

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);
  private databaseSchema: string;
  private dbSchemaWithComments: string;

  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
  ) {
    // Generate and cache the database schema
    this.generateDatabaseSchema();
  }

  private async generateDatabaseSchema() {
    // Use exact table names from Prisma schema
    this.databaseSchema = `
    model Product {
  id          Int      @id @default(autoincrement())
  sku         String   @unique
  name        String
  description String?
  price       Float
  cost        Float
  categoryId  Int
  category    Category @relation(fields: [categoryId], references: [id])
  inventory   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  orderItems  OrderItem[]
}

// Categories
model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  products    Product[]
}

// Customers
model Customer {
  id           Int      @id @default(autoincrement())
  firstName    String
  lastName     String
  email        String   @unique
  phone        String?
  address      String?
  city         String?
  state        String?
  zipCode      String?
  country      String?
  regionId     Int
  region       Region   @relation(fields: [regionId], references: [id])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastPurchase DateTime?
  orders       Order[]
}

// Orders
model Order {
  id           Int         @id @default(autoincrement())
  customerId   Int
  customer     Customer    @relation(fields: [customerId], references: [id])
  orderDate    DateTime    @default(now())
  status       String      @default("pending")
  totalAmount  Float
  shippingCost Float       @default(0)
  taxAmount    Float       @default(0)
  discount     Float       @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  orderItems   OrderItem[]
}

// Order Items
model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Float
  discount  Float   @default(0)
  subtotal  Float
}

// Employees
model Employee {
  id           Int          @id @default(autoincrement())
  firstName    String
  lastName     String
  email        String       @unique
  phone        String?
  position     String
  departmentId Int
  department   Department   @relation(fields: [departmentId], references: [id])
  hireDate     DateTime
  salary       Float
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

// Departments
model Department {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  description String?
  managerId   Int?
  budget      Float
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  employees   Employee[]
}

// Marketing Campaigns
model Campaign {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  startDate   DateTime
  endDate     DateTime?
  budget      Float
  spend       Float     @default(0)
  platform    String?
  target      String?
  leads       Int       @default(0)
  conversions Int       @default(0)
  revenue     Float     @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Regions
model Region {
  id          Int        @id @default(autoincrement())
  name        String     @unique
  country     String
  customers   Customer[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

// Sales Performance
model SalesPerformance {
  id          Int      @id @default(autoincrement())
  date        DateTime
  regionId    Int
  categoryId  Int
  revenue     Float
  targetSales Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Financial Metrics
model FinancialMetrics {
  id             Int      @id @default(autoincrement())
  date           DateTime
  revenue        Float
  expenses       Float
  profit         Float
  cashflow       Float
  assets         Float
  liabilities    Float
  equityValue    Float
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

    `;

    // Schema with additional comments for the AI
    this.dbSchemaWithComments = `
    ${this.databaseSchema}

    -- IMPORTANT NOTES FOR QUERY GENERATION:
    -- ✨ GENERAL GUIDELINES:
    -- 1. All table and column names are **case-sensitive** and must be **quoted with double quotes** (e.g., "Order", "Customer", "orderDate").
    -- 2. Avoid using aliases like "o" or "c" unless absolutely necessary and clear.
    -- 3. Always reference valid relations using foreign keys, e.g., join "Product" to "OrderItem" via "productId".
    -- 4. Use **aggregate functions** like SUM, AVG, COUNT appropriately for numerical analysis.
    -- 5. Use **GROUP BY** when aggregating over time, category, customer, etc.
    -- 6. Use the correct **JOIN** direction; don't invent unrelated joins.
    -- 7. Campaign table has startDate and endDate columns (NOT date)
    -- 8. Financial data is in the FinancialMetrics table with a date column
    -- 9. Sales performance data is in the SalesPerformance table with a date column
    -- 10. All table names must be quoted with double quotes
    -- 11. For time-based analysis, use the appropriate date columns per table:
    --    - Order: orderDate
    --    - Campaign: startDate, endDate
    --    - SalesPerformance: date
    --    - FinancialMetrics: date
    --    - Product/Customer/Employee: createdAt

    -- 🧾 TABLE & COLUMN-SPECIFIC INSTRUCTIONS:

    -- PRODUCTS:
    -- - Primary date: "createdAt"
    -- - Category relation: via "categoryId"
    -- - "sku", "name", "price", and "inventory" are common fields used in inventory/product analysis.

    -- CATEGORIES:
    -- - Link to "Product" via "products"
    -- - Has fields: "name", "description"

    -- CUSTOMERS:
    -- - Primary date: "createdAt"
    -- - Last activity: "lastPurchase"
    -- - Linked to "Region" via "regionId"
    -- - Use "country", "city", "state" for geographical filters.

    -- ORDERS:
    -- - Use "orderDate" for time-based grouping
    -- - "totalAmount" includes shipping, tax, and discount.
    -- - Related to "Customer" and "OrderItem"
    -- - Join on "customerId" (NOT customer.name directly)

    -- ORDERITEMS:
    -- - Join to "Product" via "productId"
    -- - Use "quantity", "unitPrice", "discount", and "subtotal" for calculations.

    -- EMPLOYEES:
    -- - "departmentId" joins to Department
    -- - Use "salary", "position", "isActive" for employee reports.
    -- - Primary date: "hireDate"

    -- DEPARTMENTS:
    -- - Include "budget", "managerId"
    -- - Used for staff grouping.

    -- CAMPAIGNS:
    -- - Use "startDate", "endDate" (NOT "date")
    -- - "budget", "spend", "leads", "conversions", and "revenue" are relevant metrics.

    -- REGIONS:
    -- - Join to "Customer" via "regionId"
    -- - Use "country" and "name" for grouping regions.

    -- SALESPERFORMANCE:
    -- - Use "date" as primary time column
    -- - Contains "revenue" and "targetSales"
    -- - Join via "regionId" and "categoryId" if needed.
      
    -- FINANCIALMETRICS:
    -- - Use "date" as time column
    -- - Contains "revenue", "expenses", "profit", "cashflow", etc.
      
    -- ⚠️ COMMON MISTAKES TO AVOID (CORRECT THEM!):
    -- - ❌ Using "date" in Campaign (✅ use "startDate"/"endDate")
    -- - ❌ Using unquoted table/column names (✅ use "Product", "orderDate", etc.)
    -- - ❌ Using undefined columns like "customerName" (✅ use "firstName", "lastName" from "Customer")
    -- - ❌ Joining unrelated tables (✅ join via foreign keys only)
    -- - ❌ Forgetting to GROUP BY when using aggregates (✅ include GROUP BY when using SUM, COUNT, etc.)
    -- - ❌ Using wrong table for financial data (✅ use "FinancialMetrics")
    -- - ❌ Treating "Order" as a reserved keyword (✅ quote as "Order")
      
    -- ✅ GOAL: Generate syntactically correct and semantically meaningful SQL for Postgres based on the above schema and instructions.

    
    -- IMPORTANT NOTES FOR QUERY GENERATION:
    `;
  }

  async processQuery(query: string): Promise<any> {
    let generatedSql: string | undefined;
    try {
      // 1. Generate SQL from the natural language query
      generatedSql = await this.openaiService.generateSQLFromQuestion(
        query,
        this.dbSchemaWithComments, // Use the schema with detailed comments
      );

      this.logger.log(`Generated SQL: ${generatedSql}`);

      // 2. Execute the SQL query
      const results = await this.executeRawQuery(generatedSql);

      // 3. Generate natural language explanation of the results
      const explanation = await this.openaiService.explainQueryResults(
        query,
        generatedSql,
        results,
      );

      // 4. Return complete result
      return {
        question: query,
        sql: generatedSql,
        data: this.transformDataForVisualization(results),
        answer: explanation.answer,
        chartType: explanation.chartType,
      };
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);

      // If error is SQL-related, try to regenerate with more specific instructions
      if (error.message && error.message.includes('Raw query failed')) {
        return this.handleSqlError(query, error, generatedSql);
      }

      throw error;
    }
  }

  private async handleSqlError(
    query: string,
    error: any,
    generatedSql: string,
  ): Promise<any> {
    this.logger.log(`Attempting to recover from SQL error: ${error.message}`);

    // Extract the error message to give better context to the AI
    const errorMsg = error.message || 'Unknown database error';

    try {
      // Create more specific instructions based on the error
      const enhancedSchema = `
### Database Schema
${this.dbSchemaWithComments}

### User's Natural Language Query
${query}

### Initial Generated SQL
${generatedSql}

### Error Returned
${errorMsg}

### Instruction
Please regenerate a corrected SQL query based on the above schema, query, and error.
Make sure:
- All table and column names exist
- Joins are correct
- SQL syntax is valid
`;

      // Regenerate SQL with error context
      const regeneratedSql = await this.openaiService.generateSQLFromQuestion(
        query,
        enhancedSchema,
      );

      this.logger.log(`Regenerated SQL after error: ${regeneratedSql}`);

      // Try executing the regenerated SQL
      const results = await this.executeRawQuery(regeneratedSql);

      // Generate explanation for the successful query
      const explanation = await this.openaiService.explainQueryResults(
        query,
        regeneratedSql,
        results,
      );

      return {
        question: query,
        sql: regeneratedSql,
        data: this.transformDataForVisualization(results),
        answer: explanation.answer,
        chartType: explanation.chartType,
      };
    } catch (retryError) {
      this.logger.error(`Recovery attempt failed: ${retryError.message}`);

      // If second attempt fails, fall back to sample data
      const sampleData = this.generateSampleData(query);

      const defaultExplanation = {
        answer: `I couldn't execute your query due to a database issue, but I've generated some sample data that might help answer your question. The database reported: ${errorMsg}`,
        chartType: this.determineChartTypeFromQuery(query),
      };

      return {
        question: query,
        sql: '-- Query execution failed',
        data: this.transformDataForVisualization(sampleData),
        answer: defaultExplanation.answer,
        chartType: defaultExplanation.chartType,
      };
    }
  }

  private determineChartTypeFromQuery(query: string): string {
    const queryLower = query.toLowerCase();

    // Simple heuristics for chart type
    if (
      queryLower.includes('over time') ||
      queryLower.includes('trend') ||
      queryLower.includes('growth') ||
      queryLower.includes('monthly') ||
      queryLower.includes('yearly')
    ) {
      return 'line';
    } else if (
      queryLower.includes('percentage') ||
      queryLower.includes('proportion') ||
      queryLower.includes('breakdown') ||
      queryLower.includes('distribution')
    ) {
      return 'pie';
    } else {
      return 'bar';
    }
  }

  private async executeRawQuery(sql: string): Promise<any[]> {
    try {
      // Validate SQL and handle common issues before execution
      const processedSql = this.validateAndFixSql(sql);

      // Using Prisma's $queryRawUnsafe to execute raw SQL
      const rawResult = await this.prisma.$queryRawUnsafe(processedSql);

      const sanitizedResults = (rawResult as any[]).map((row) => {
        const newRow: Record<string, any> = {};
        for (const key in row) {
          const value = row[key];
          newRow[key] = typeof value === 'bigint' ? Number(value) : value;
        }
        return newRow;
      });

      return sanitizedResults;
    } catch (error) {
      this.logger.error(`Database query error: ${error.message}`);

      // Rethrow the error for the error handler to process
      throw error;
    }
  }

  private validateAndFixSql(sql: string): string {
    let processedSql = sql;

    // Fix common issues with AI-generated SQL

    // Fix incorrect column references on the Campaign table
    if (sql.includes('c."date"') && !sql.toLowerCase().includes('date as')) {
      processedSql = processedSql.replace(/c\."date"/g, 'c."startDate"');
    }

    // Ensure correct table aliases are used consistently
    const tableAliasMap = this.extractTableAliases(sql);
    for (const [table, alias] of Object.entries(tableAliasMap)) {
      // Check for column mismatches using wrong table aliases
      if (alias && table === 'Campaign') {
        // Make sure startDate and endDate are correctly referenced
        const regex = new RegExp(`(?<!(${alias}\\."))(start|end)Date`, 'gi');
        processedSql = processedSql.replace(regex, `${alias}."$1Date"`);
      }
    }

    return processedSql;
  }

  private extractTableAliases(sql: string): Record<string, string> {
    const aliasMap: Record<string, string> = {};

    // Extract table aliases from common SQL patterns
    const fromMatches = sql.matchAll(/FROM\s+"(\w+)"\s+(?:AS\s+)?(\w+)/gi);
    const joinMatches = sql.matchAll(/JOIN\s+"(\w+)"\s+(?:AS\s+)?(\w+)/gi);

    for (const match of Array.from(fromMatches)) {
      if (match[1] && match[2]) {
        aliasMap[match[1]] = match[2];
      }
    }

    for (const match of Array.from(joinMatches)) {
      if (match[1] && match[2]) {
        aliasMap[match[1]] = match[2];
      }
    }

    return aliasMap;
  }

  private transformDataForVisualization(data: any[]): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    // Check if the data is already in the right format for charting
    const hasNameProperty = data.some((item) => 'name' in item);

    if (hasNameProperty) {
      return data;
    }

    // Get the keys from the first object
    const keys = Object.keys(data[0]);

    // If there are only two numeric columns, format for simple chart (pie or bar)
    if (keys.length === 2 && typeof data[0][keys[1]] === 'number') {
      return data.map((item) => ({
        name: String(item[keys[0]]),
        value: item[keys[1]],
      }));
    }

    // For multiple columns or more complex data
    return data.map((item) => {
      const transformedItem: any = { name: String(item[keys[0]]) };

      // Add all other properties except the first one which is used as 'name'
      for (let i = 1; i < keys.length; i++) {
        transformedItem[keys[i]] = item[keys[i]];
      }

      return transformedItem;
    });
  }

  private generateSampleData(query: string): any[] {
    const queryLower = query.toLowerCase();

    // Enhanced logic to generate more targeted mock data based on the query

    // Check if it's a query about marketing spend and revenue
    if (
      queryLower.includes('marketing spend') &&
      (queryLower.includes('revenue') || queryLower.includes('roi'))
    ) {
      if (queryLower.includes('correlation')) {
        return [
          { correlation: 0.83 }, // Sample correlation value
        ];
      } else {
        return [
          { month: 'Jan', marketing_spend: 25000, revenue: 125000, roi: 5.0 },
          { month: 'Feb', marketing_spend: 30000, revenue: 145000, roi: 4.83 },
          { month: 'Mar', marketing_spend: 35000, revenue: 165000, roi: 4.71 },
          { month: 'Apr', marketing_spend: 40000, revenue: 200000, roi: 5.0 },
          { month: 'May', marketing_spend: 45000, revenue: 220000, roi: 4.89 },
          { month: 'Jun', marketing_spend: 50000, revenue: 250000, roi: 5.0 },
        ];
      }
    }

    // Check if it's a query about products or categories
    if (queryLower.includes('product') || queryLower.includes('category')) {
      return [
        { category: 'Electronics', revenue: 125000, units_sold: 500 },
        { category: 'Clothing', revenue: 85000, units_sold: 1200 },
        { category: 'Home Goods', revenue: 65000, units_sold: 350 },
        { category: 'Sports', revenue: 45000, units_sold: 200 },
        { category: 'Beauty', revenue: 35000, units_sold: 800 },
      ];
    }

    // Check if it's about regions or customers
    if (queryLower.includes('region') || queryLower.includes('customer')) {
      return [
        { region: 'North America', customers: 5200, revenue: 320000 },
        { region: 'Europe', customers: 4100, revenue: 250000 },
        { region: 'Asia', customers: 3800, revenue: 210000 },
        { region: 'South America', customers: 1900, revenue: 95000 },
        { region: 'Africa', customers: 800, revenue: 45000 },
      ];
    }

    // Check if it's about employees or departments
    if (queryLower.includes('employee') || queryLower.includes('department')) {
      return [
        { department: 'Sales', employee_count: 45, avg_salary: 75000 },
        { department: 'Marketing', employee_count: 30, avg_salary: 70000 },
        { department: 'Engineering', employee_count: 65, avg_salary: 95000 },
        {
          department: 'Customer Support',
          employee_count: 50,
          avg_salary: 60000,
        },
        { department: 'HR', employee_count: 15, avg_salary: 65000 },
      ];
    }

    // Default financial data
    if (
      queryLower.includes('financ') ||
      queryLower.includes('revenue') ||
      queryLower.includes('profit')
    ) {
      return [
        {
          year: '2020',
          quarter: 'Q1',
          revenue: 250000,
          expenses: 180000,
          profit: 70000,
        },
        {
          year: '2020',
          quarter: 'Q2',
          revenue: 310000,
          expenses: 210000,
          profit: 100000,
        },
        {
          year: '2020',
          quarter: 'Q3',
          revenue: 290000,
          expenses: 200000,
          profit: 90000,
        },
        {
          year: '2020',
          quarter: 'Q4',
          revenue: 350000,
          expenses: 230000,
          profit: 120000,
        },
        {
          year: '2021',
          quarter: 'Q1',
          revenue: 280000,
          expenses: 190000,
          profit: 90000,
        },
      ];
    }

    // Generic time series data
    return [
      { month: 'Jan', value: 65000 },
      { month: 'Feb', value: 78000 },
      { month: 'Mar', value: 90000 },
      { month: 'Apr', value: 81000 },
      { month: 'May', value: 95000 },
      { month: 'Jun', value: 110000 },
    ];
  }
}
