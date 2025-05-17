// src/ai/openai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      dangerouslyAllowBrowser: true,
    });
  }

  async generateSQLFromQuestion(
    question: string,
    databaseSchema: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        store: true,
        messages: [
          {
            role: 'system',
            content: `You are an advanced SQL expert that translates natural language business questions into PostgreSQL queries.
            
You'll be given the database schema and a business question. Your job is to generate a correct, optimized SQL query that answers the question.

IMPORTANT GUIDELINES:
1. Ensure all table names in the query have double quotes around them exactly as shown in the schema (e.g., "Product" not product). PostgreSQL is case-sensitive with table names.
2. Be extremely careful with column names. Only use columns that actually exist in the tables.
3. Pay specific attention to date-related columns:
   - The "Campaign" table has "startDate" and "endDate" columns (NOT "date")
   - The "FinancialMetrics" table has a "date" column
   - The "SalesPerformance" table has a "date" column
   - The "Order" table uses "orderDate"
4. Check all column references in SELECT, WHERE, JOIN, GROUP BY, and ORDER BY clauses.
5. Use explicit table aliases for all column references (e.g., c."startDate", not just "startDate").
6. For time-based comparisons between tables, use appropriate date columns.

ADDITIONAL REQUIREMENTS:
- Use explicit joins rather than implicit joins in the WHERE clause.
- Use aliases for clarity.
- Format the query with proper indentation.
- Make sure to handle potential NULL values appropriately.
- Use appropriate aggregation functions when needed.
- Use CTEs (WITH clause) for complex queries to improve readability.

Only return the SQL query without any explanations or markdown formatting.

Here's the database schema:
${databaseSchema}`,
          },
          {
            role: 'user',
            content: `Generate a PostgreSQL query that answers this business question: "${question}"`,
          },
        ],
        temperature: 0,
        max_tokens: 1000,
      });
      // console.log('OpenAI Response:', response);
      return response.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error(`Error generating SQL: ${error.message}`);
      throw new Error('Failed to generate SQL query');
    }
  }

  async explainQueryResults(
    question: string,
    sqlQuery: string,
    results: any[],
  ): Promise<{ answer: string; chartType: string }> {
    try {
      const resultsString = JSON.stringify(results, null, 2);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an advanced data analyst who explains SQL query results in clear, natural language. 
            
You'll be given a business question, the SQL query used to answer it, and the query results. Your task is to:

1. Analyze the data thoroughly
2. Provide a comprehensive natural language explanation of what the data shows
3. Highlight key insights, trends, or patterns
4. Determine the most appropriate chart type for visualizing this data (bar, line, or pie)

For the chart type, follow these guidelines:
- Use 'bar' for comparisons across categories
- Use 'line' for time series data or trends
- Use 'pie' for composition/percentage breakdown
- Default to 'bar' if unsure

Format your response as a JSON object with two fields:
1. "answer": Your detailed natural language explanation
2. "chartType": The recommended chart type (bar, line, or pie)

Keep the explanation clear but comprehensive, providing business insights rather than just describing the data.`,
          },
          {
            role: 'user',
            content: `Business Question: "${question}"
            
SQL Query:
${sqlQuery}

Query Results:
${resultsString}

Provide your analysis and chart recommendation:`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1000,
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      this.logger.error(`Error explaining results: ${error.message}`);
      throw new Error('Failed to explain query results');
    }
  }
}
