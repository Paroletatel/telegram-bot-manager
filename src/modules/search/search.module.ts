import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Form } from '../forms/models/form.model';
@Module({
  controllers: [SearchController],
  providers: [SearchService],
  imports: [SequelizeModule.forFeature([Form])],
})
export class SearchModule {}
