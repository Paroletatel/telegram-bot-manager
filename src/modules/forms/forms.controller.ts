import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { FormsService } from './forms.service';
import { AppFormDTO } from './app-form.dto';

@Controller('forms')
export class FormsController {
  constructor(private formsService: FormsService) {}
  @Post('/continueRegistration')
  continueRegistration(@Body('userId') userId: string) {
    return this.formsService.continueRegistration(userId);
  }

  @Get('/getNewFormsList')
  getNewFormsList() {
    return this.formsService.getNewFormsForApproveList();
  }

  @Get('/getUsersWithApprovedForm')
  getUsersWithApprovedForm() {
    return this.formsService.getUsersWithApprovedForm();
  }

  @Get('/searchUser/:value')
  searchUser(@Param('value') value: string) {
    return this.formsService.searchUser(value);
  }

  @Get('/searchUserById/:value')
  searchUserById(@Param('value') value: string) {
    return this.formsService.searchUserById(value);
  }

  @Get('/deleteUser/:userId')
  deleteUser(@Param('userId') userId: string) {
    return this.formsService.deleteUser(String(userId));
  }

  @Get('/checkNewRequests')
  checkNewRequests() {
    return this.formsService.checkNewRequests();
  }

  @Post('/approveNewForm')
  approveNewForm(@Body() formInfo: AppFormDTO) {
    return this.formsService.approveNewForm(formInfo);
  }

  @Post('/createFormByAdmin')
  createFormByAdmin(@Body() formInfo: AppFormDTO) {
    return this.formsService.createFormByAdmin(formInfo);
  }

  @Post('/rejectNewForm')
  rejectNewForm(@Body() formInfo: AppFormDTO) {
    return this.formsService.rejectNewForm(formInfo);
  }

  @Get('/getFreshCreatedForm/:userId')
  getFreshCreatedForm(@Param('userId') userId: string) {
    return this.formsService.getFreshCreatedForm(String(userId));
  }

  @Post('/userFilledNewForm')
  userFilledNewForm(@Body() form: AppFormDTO) {
    return this.formsService.userFilledNewForm(form);
  }

  @Get('/getFirstFilledForm/:userId')
  getFirstFilledForm(@Param('userId') userId: string) {
    return this.formsService.getFirstFilledForm(String(userId));
  }

  @Get('/getMainForm/:userId')
  getMainForm(@Param('userId') userId: string) {
    return this.formsService.getMainForm(String(userId));
  }

  @Get('/getMainFormWithChats/:userId')
  getMainFormWithChats(@Param('userId') userId: string) {
    return this.formsService.getMainFormWithChats(String(userId));
  }

  @Get('/getChangedFormsIds')
  getChangedFormsIds() {
    return this.formsService.getChangedFormsIds();
  }

  @Get('/getPrevForm/:userId')
  getPrevForm(@Param('userId') userId: string) {
    return this.formsService.getPrevForm(userId);
  }

  @Post('/adminApprovesChangesInForm')
  adminApprovesChangesInForm(@Body() form: AppFormDTO) {
    return this.formsService.adminApprovesChangesInForm(form);
  }

  @Post('/changeFormByUser')
  changeFormByUser(@Body() form: AppFormDTO) {
    return this.formsService.changeFormByUser(form);
  }

  @Get('/checkNewFormsChanges')
  checkNewFormsChanges() {
    return this.formsService.checkNewFormsChanges();
  }

  @Get('/getAllFormsList')
  getAllFormsList() {
    return this.formsService.getAllFormsList();
  }

  @Get('/registrationAdmin/:userId')
  registrationAdmin(@Param('userId') userId: string) {
    return this.formsService.registrationAdmin(userId);
  }

  @Get('/isUserAuth/:userId')
  isUserAuth(@Param('userId') userId: string) {
    return this.formsService.isUserAuth(userId);
  }

  // ================= Admin Drafts (server-side autosave) =================
  @Post('/adminDraft/upsert')
  upsertAdminDraft(@Body() payload: { draftId?: string; form: AppFormDTO }) {
    const { draftId, form } = payload;
    return this.formsService.upsertAdminDraft(form, draftId);
  }

  @Get('/adminDraft/:draftId')
  getAdminDraft(@Param('draftId') draftId: string) {
    return this.formsService.getAdminDraft(draftId);
  }

  @Delete('/adminDraft/:draftId')
  deleteAdminDraft(@Param('draftId') draftId: string) {
    return this.formsService.deleteAdminDraft(draftId);
  }
}
