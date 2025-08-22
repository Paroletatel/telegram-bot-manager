import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../roles/roles.decorator';
import { RolesGuard } from '../roles/roles.guard';
import { RoleTypeEnum } from '../roles/roles.service';
import { AppFormDTO } from './app-form.dto';
import { AppFormBodyDto } from './dto/app-form-body.dto';
import { UpsertAdminDraftDto } from './dto/upsert-admin-draft.dto';
import { FormsService } from './forms.service';
import { FormsCommandsService } from './forms-commands.service';
import { FormsDraftsService } from './forms-drafts.service';
import { FormsQueriesService } from './forms-queries.service';
import { mapToAppFormDTO } from './utils/form-mapper';

@ApiTags('Forms')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('forms')
export class FormsController {
  constructor(
    private formsService: FormsService,
    private draftsService: FormsDraftsService,
    private queriesService: FormsQueriesService,
    private commandsService: FormsCommandsService,
  ) {}
  @Post('/continueRegistration')
  @ApiOperation({ summary: 'Продолжить регистрацию пользователя' })
  continueRegistration(@Body('userId') userId: string) {
    return this.commandsService.continueRegistration(userId);
  }

  @Get('/getNewFormsList')
  @ApiOperation({ summary: 'Список новых анкет, ожидающих подтверждения' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы (1..N)', schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы (1..100)', schema: { default: 20 } })
  @ApiQuery({ name: 'sort', required: false, description: 'Поле сортировки (createdAt, updatedAt, systemName, userId)', schema: { default: 'createdAt' } })
  @ApiQuery({ name: 'order', required: false, description: 'Порядок сортировки (asc|desc)', schema: { default: 'desc' } })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  getNewFormsList(
    @Query('botId') botId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const legacy = page === undefined && limit === undefined && sort === undefined && order === undefined;
    return this.queriesService
      .getNewFormsForApproveList(botId, Number(page) || 1, Number(limit) || 20, sort, order)
      .then((res) => (legacy ? res.items : res));
  }

  @Get('/getUsersWithApprovedForm')
  @ApiOperation({ summary: 'Промоут статуса approved в main, вернуть список' })
  getUsersWithApprovedForm() {
    return this.commandsService.getUsersWithApprovedForm();
  }

  @Get('/searchUser/:value')
  @ApiOperation({ summary: 'Поиск пользователя по полям (phone, systemName, INN, city)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы (1..N)', schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы (1..100)', schema: { default: 20 } })
  @ApiQuery({ name: 'sort', required: false, description: 'Поле сортировки (systemName, createdAt, updatedAt, userId)', schema: { default: 'systemName' } })
  @ApiQuery({ name: 'order', required: false, description: 'Порядок сортировки (asc|desc)', schema: { default: 'asc' } })
  searchUser(
    @Param('value') value: string,
    @Query('botId') botId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const legacy = page === undefined && limit === undefined && sort === undefined && order === undefined;
    return this.queriesService
      .searchUser(value, botId, Number(page) || 1, Number(limit) || 20, sort, order)
      .then((res) => (legacy ? res.items : res));
  }

  @Get('/searchUserById/:value')
  @ApiOperation({ summary: 'Получить пользователя по userId' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  searchUserById(@Param('value') value: string, @Query('botId') botId?: string) {
    return this.queriesService.searchUserById(value, botId);
  }

  @Get('/deleteUser/:userId')
  @ApiOperation({ summary: 'Удалить пользователя и связанные записи' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  deleteUser(@Param('userId') userId: string) {
    return this.commandsService.deleteUser(String(userId));
  }

  @Get('/checkNewRequests')
  @ApiOperation({ summary: 'Промаркировать filled -> waiting и вернуть список' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  checkNewRequests() {
    return this.commandsService.checkNewRequests();
  }

  @Post('/approveNewForm')
  @ApiOperation({ summary: 'Подтвердить новую анкету' })
  @ApiBody({ type: AppFormBodyDto })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  approveNewForm(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.commandsService.approveNewForm(mapped);
  }

  @Post('/createFormByAdmin')
  @ApiOperation({ summary: 'Создать основную анкету админом' })
  @ApiBody({ type: AppFormBodyDto })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  createFormByAdmin(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.commandsService.createFormByAdmin(mapped);
  }

  @Post('/rejectNewForm')
  @ApiOperation({ summary: 'Отклонить новую анкету' })
  @ApiBody({ type: AppFormBodyDto })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  rejectNewForm(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.commandsService.rejectNewForm(mapped);
  }

  @Get('/getFreshCreatedForm/:userId')
  @ApiOperation({ summary: 'Получить заново созданную (created) анкету' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getFreshCreatedForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.getFreshCreatedForm(String(userId), botId);
  }

  @Post('/userFilledNewForm')
  @ApiOperation({ summary: 'Пользователь заполнил новую анкету (created -> filled)' })
  @ApiBody({ type: AppFormBodyDto })
  userFilledNewForm(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.commandsService.userFilledNewForm(mapped);
  }

  @Get('/getFirstFilledForm/:userId')
  @ApiOperation({ summary: 'Получить первую заполненную анкету (waiting)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getFirstFilledForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.getFirstFilledForm(String(userId), botId);
  }

  @Get('/getMainForm/:userId')
  @ApiOperation({ summary: 'Получить основную анкету' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getMainForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.getMainForm(String(userId), botId);
  }

  @Get('/getMainFormWithChats/:userId')
  @ApiOperation({ summary: 'Основная анкета + чаты пользователя' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getMainFormWithChats(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.getMainFormWithChats(String(userId), botId);
  }

  @Get('/getChangedFormsIds')
  @ApiOperation({ summary: 'Список анкет со статусом waiting/changed' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  getChangedFormsIds(@Query('botId') botId?: string) {
    return this.queriesService.getChangedFormsIds(botId);
  }

  @Get('/getPrevForm/:userId')
  @ApiOperation({ summary: 'Получить предыдущую версию анкеты' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getPrevForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.getPrevForm(userId, botId);
  }

  @Post('/adminApprovesChangesInForm')
  @ApiOperation({ summary: 'Админ подтверждает изменения анкеты' })
  @ApiBody({ type: AppFormBodyDto })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  adminApprovesChangesInForm(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.commandsService.adminApprovesChangesInForm(mapped);
  }

  @Post('/changeFormByUser')
  @ApiOperation({ summary: 'Пользователь отправляет изменения анкеты' })
  @ApiBody({ type: AppFormBodyDto })
  changeFormByUser(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.commandsService.changeFormByUser(mapped);
  }

  @Get('/checkNewFormsChanges')
  @ApiOperation({ summary: 'Проверить и промаркировать changed -> waiting' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  checkNewFormsChanges() {
    return this.commandsService.checkNewFormsChanges();
  }

  @Get('/getAllFormsList')
  @ApiOperation({ summary: 'Список всех анкет (userId + systemName)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы (1..N)', schema: { default: 1 } })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы (1..100)', schema: { default: 20 } })
  @ApiQuery({ name: 'sort', required: false, description: 'Поле сортировки (createdAt, updatedAt, systemName, userId)', schema: { default: 'createdAt' } })
  @ApiQuery({ name: 'order', required: false, description: 'Порядок сортировки (asc|desc)', schema: { default: 'desc' } })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  getAllFormsList(
    @Query('botId') botId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const legacy = page === undefined && limit === undefined && sort === undefined && order === undefined;
    return this.queriesService
      .getAllFormsList(botId, Number(page) || 1, Number(limit) || 20, sort, order)
      .then((res) => (legacy ? res.items : res));
  }

  @Get('/registrationAdmin/:userId')
  @ApiOperation({ summary: 'Админ завершает регистрацию пользователя' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  registrationAdmin(@Param('userId') userId: string) {
    return this.commandsService.registrationAdmin(userId);
  }

  @Get('/isUserAuth/:userId')
  @ApiOperation({ summary: 'Проверка наличия анкеты (аутентификация)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  isUserAuth(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.queriesService.isUserAuth(userId, botId);
  }

  // ================= Admin Drafts (server-side autosave) =================
  @Post('/adminDraft/upsert')
  @ApiOperation({ summary: 'Создать/обновить админский черновик формы' })
  @ApiBody({ type: UpsertAdminDraftDto })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  upsertAdminDraft(@Body() payload: UpsertAdminDraftDto) {
    const { draftId, form } = payload;
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.draftsService.upsertAdminDraft(mapped, draftId);
  }

  @Get('/adminDraft/:draftId')
  @ApiOperation({ summary: 'Получить админский черновик формы' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  getAdminDraft(@Param('draftId') draftId: string) {
    return this.draftsService.getAdminDraft(draftId);
  }

  @Delete('/adminDraft/:draftId')
  @ApiOperation({ summary: 'Удалить админский черновик формы' })
  @UseGuards(RolesGuard)
  @Roles(RoleTypeEnum.ADMIN)
  deleteAdminDraft(@Param('draftId') draftId: string) {
    return this.draftsService.deleteAdminDraft(draftId);
  }
}
