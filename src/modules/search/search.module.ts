import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { AuthModule } from '../auth/auth.module';
import { Form } from '../forms/models/form.model';
import { RolesModule } from '../roles/roles.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
@Module({
  controllers: [SearchController],
  providers: [SearchService],
  imports: [
    SequelizeModule.forFeature([Form]),
    AuthModule,
    RolesModule,
  ],
})
export class SearchModule {}
