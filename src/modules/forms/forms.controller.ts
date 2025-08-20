import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { AppFormDTO } from './app-form.dto';
import { AppFormBodyDto } from './dto/app-form-body.dto';
import { UpsertAdminDraftDto } from './dto/upsert-admin-draft.dto';
import { mapToAppFormDTO } from './utils/form-mapper';

@ApiTags('Forms')
@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}
  @Post('/continueRegistration')
  @ApiOperation({ summary: 'Продолжить регистрацию пользователя' })
  continueRegistration(@Body('userId') userId: string) {
    return this.formsService.continueRegistration(userId);
  }

  @Get('/getNewFormsList')
  @ApiOperation({ summary: 'Список новых анкет, ожидающих подтверждения' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getNewFormsList(@Query('botId') botId?: string) {
    return this.formsService.getNewFormsForApproveList(botId);
  }

  @Get('/getUsersWithApprovedForm')
  @ApiOperation({ summary: 'Промоут статуса approved в main, вернуть список' })
  getUsersWithApprovedForm() {
    return this.formsService.getUsersWithApprovedForm();
  }

  @Get('/searchUser/:value')
  @ApiOperation({ summary: 'Поиск пользователя по полям (phone, systemName, INN, city)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  searchUser(@Param('value') value: string, @Query('botId') botId?: string) {
    return this.formsService.searchUser(value, botId);
  }

  @Get('/searchUserById/:value')
  @ApiOperation({ summary: 'Получить пользователя по userId' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  searchUserById(@Param('value') value: string, @Query('botId') botId?: string) {
    return this.formsService.searchUserById(value, botId);
  }

  @Get('/deleteUser/:userId')
  @ApiOperation({ summary: 'Удалить пользователя и связанные записи' })
  deleteUser(@Param('userId') userId: string) {
    return this.formsService.deleteUser(String(userId));
  }

  @Get('/checkNewRequests')
  @ApiOperation({ summary: 'Промаркировать filled -> waiting и вернуть список' })
  checkNewRequests() {
    return this.formsService.checkNewRequests();
  }

  @Post('/approveNewForm')
  @ApiOperation({ summary: 'Подтвердить новую анкету' })
  @ApiBody({ type: AppFormBodyDto })
  approveNewForm(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.formsService.approveNewForm(mapped);
  }

  @Post('/createFormByAdmin')
  @ApiOperation({ summary: 'Создать основную анкету админом' })
  @ApiBody({ type: AppFormBodyDto })
  createFormByAdmin(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.formsService.createFormByAdmin(mapped);
  }

  @Post('/rejectNewForm')
  @ApiOperation({ summary: 'Отклонить новую анкету' })
  @ApiBody({ type: AppFormBodyDto })
  rejectNewForm(@Body() formInfo: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(formInfo);
    return this.formsService.rejectNewForm(mapped);
  }

  @Get('/getFreshCreatedForm/:userId')
  @ApiOperation({ summary: 'Получить заново созданную (created) анкету' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getFreshCreatedForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.getFreshCreatedForm(String(userId), botId);
  }

  @Post('/userFilledNewForm')
  @ApiOperation({ summary: 'Пользователь заполнил новую анкету (created -> filled)' })
  @ApiBody({ type: AppFormBodyDto })
  userFilledNewForm(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.formsService.userFilledNewForm(mapped);
  }

  @Get('/getFirstFilledForm/:userId')
  @ApiOperation({ summary: 'Получить первую заполненную анкету (waiting)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getFirstFilledForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.getFirstFilledForm(String(userId), botId);
  }

  @Get('/getMainForm/:userId')
  @ApiOperation({ summary: 'Получить основную анкету' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getMainForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.getMainForm(String(userId), botId);
  }

  @Get('/getMainFormWithChats/:userId')
  @ApiOperation({ summary: 'Основная анкета + чаты пользователя' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getMainFormWithChats(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.getMainFormWithChats(String(userId), botId);
  }

  @Get('/getChangedFormsIds')
  @ApiOperation({ summary: 'Список анкет со статусом waiting/changed' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getChangedFormsIds(@Query('botId') botId?: string) {
    return this.formsService.getChangedFormsIds(botId);
  }

  @Get('/getPrevForm/:userId')
  @ApiOperation({ summary: 'Получить предыдущую версию анкеты' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getPrevForm(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.getPrevForm(userId, botId);
  }

  @Post('/adminApprovesChangesInForm')
  @ApiOperation({ summary: 'Админ подтверждает изменения анкеты' })
  @ApiBody({ type: AppFormBodyDto })
  adminApprovesChangesInForm(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.formsService.adminApprovesChangesInForm(mapped);
  }

  @Post('/changeFormByUser')
  @ApiOperation({ summary: 'Пользователь отправляет изменения анкеты' })
  @ApiBody({ type: AppFormBodyDto })
  changeFormByUser(@Body() form: AppFormBodyDto) {
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.formsService.changeFormByUser(mapped);
  }

  @Get('/checkNewFormsChanges')
  @ApiOperation({ summary: 'Проверить и промаркировать changed -> waiting' })
  checkNewFormsChanges() {
    return this.formsService.checkNewFormsChanges();
  }

  @Get('/getAllFormsList')
  @ApiOperation({ summary: 'Список всех анкет (userId + systemName)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  getAllFormsList(@Query('botId') botId?: string) {
    return this.formsService.getAllFormsList(botId);
  }

  @Get('/registrationAdmin/:userId')
  @ApiOperation({ summary: 'Админ завершает регистрацию пользователя' })
  registrationAdmin(@Param('userId') userId: string) {
    return this.formsService.registrationAdmin(userId);
  }

  @Get('/isUserAuth/:userId')
  @ApiOperation({ summary: 'Проверка наличия анкеты (аутентификация)' })
  @ApiQuery({ name: 'botId', required: false, description: 'ID бота (для мультибота)' })
  isUserAuth(@Param('userId') userId: string, @Query('botId') botId?: string) {
    return this.formsService.isUserAuth(userId, botId);
  }

  // ================= Admin Drafts (server-side autosave) =================
  @Post('/adminDraft/upsert')
  @ApiOperation({ summary: 'Создать/обновить админский черновик формы' })
  @ApiBody({ type: UpsertAdminDraftDto })
  upsertAdminDraft(@Body() payload: UpsertAdminDraftDto) {
    const { draftId, form } = payload;
    const mapped: AppFormDTO = mapToAppFormDTO(form);
    return this.formsService.upsertAdminDraft(mapped, draftId);
  }

  @Get('/adminDraft/:draftId')
  @ApiOperation({ summary: 'Получить админский черновик формы' })
  getAdminDraft(@Param('draftId') draftId: string) {
    return this.formsService.getAdminDraft(draftId);
  }

  @Delete('/adminDraft/:draftId')
  @ApiOperation({ summary: 'Удалить админский черновик формы' })
  deleteAdminDraft(@Param('draftId') draftId: string) {
    return this.formsService.deleteAdminDraft(draftId);
  }
}
