import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('/findFormByINN/:inn')
  findFormByINN(@Param('inn') inn: string) {
    return this.searchService.findFormByINN(inn);
  }

  @Get('/findFormByPhone/:phone')
  findFormByPhone(@Param('phone') phone: string) {
    return this.searchService.findFormByPhone(phone);
  }

  @Get('/findFormBySystemName/:name')
  findFormBySystemName(@Param('name') name: string) {
    return this.searchService.findFormBySystemName(name);
  }

  @Get('/findFormByName/:name')
  findFormByName(@Param('name') name: string) {
    return this.searchService.findFormByName(name);
  }

  @Get('/findFormBySurname/:name')
  findFormBySurname(@Param('name') name: string) {
    return this.searchService.findFormBySurname(name);
  }

  @Get('/findFormByUsername/:name')
  findFormByUsername(@Param('name') name: string) {
    return this.searchService.findFormByUsername(name);
  }

  @Get('/findFormByINNActive/:inn')
  findFormByINNActive(@Param('inn') inn: string) {
    return this.searchService.findFormByINNActive(inn);
  }

  @Get('/findFormByPhoneActive/:phone')
  findFormByPhoneActive(@Param('phone') phone: string) {
    return this.searchService.findFormByPhoneActive(phone);
  }

  @Get('/findFormBySystemNameActive/:name')
  findFormBySystemNameActive(@Param('name') name: string) {
    return this.searchService.findFormBySystemNameActive(name);
  }

  @Get('/findFormByNameActive/:name')
  findFormByNameActive(@Param('name') name: string) {
    return this.searchService.findFormByNameActive(name);
  }

  @Get('/findFormBySurnameActive/:name')
  findFormBySurnameActive(@Param('name') name: string) {
    return this.searchService.findFormBySurnameActive(name);
  }

  @Get('/findFormByUsernameActive/:name')
  findFormByUsernameActive(@Param('name') name: string) {
    return this.searchService.findFormByUsernameActive(name);
  }

  @Post('/adminVectorSearch')
  adminVectorSearch(@Body('query') query: string) {
    return this.searchService.adminVectorSearch(query);
  }
}
