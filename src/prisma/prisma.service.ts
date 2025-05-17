// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper method to clean database during testing
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      const models = Reflect.ownKeys(this).filter(
        (key) =>
          key[0] !== '_' &&
          key[0] !== '$' &&
          typeof this[key] === 'object' &&
          this[key] !== null &&
          'deleteMany' in this[key],
      );

      return Promise.all(
        models.map(async (modelKey) => {
          try {
            return await this[modelKey].deleteMany();
          } catch (error) {
            console.error(`Error cleaning ${String(modelKey)}:`, error);
          }
        }),
      );
    }
  }
}
