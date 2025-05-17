// src/query/query.controller.ts
import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { QueryDto } from './query.dto';
import { QueryService } from './query.service';

@Controller('api')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(private queryService: QueryService) {}

  @Post('query')
  async processQuery(@Body() queryDto: QueryDto) {
    try {
      this.logger.log(`Received query: ${queryDto.query}`);
      const result = await this.queryService.processQuery(queryDto.query);
      return result;
    } catch (error) {
      this.logger.error(`Error processing query: ${error.message}`);
      throw new HttpException(
        'Failed to process your query. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
