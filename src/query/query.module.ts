import { Module } from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AIModule } from 'src/ai/ai.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { OpenAIService } from 'src/ai/openai.service';

@Module({
  imports: [PrismaModule, AIModule],
  providers: [QueryService, PrismaService, OpenAIService],
  controllers: [QueryController],
  exports: [QueryService],
})
export class QueryModule {}
