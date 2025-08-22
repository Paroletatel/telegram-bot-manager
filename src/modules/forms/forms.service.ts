import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

import { Contact } from '../contacts/contact.model';
import { PhoneNumber } from '../phone-numbers/phone-number.model';
import { Settings } from '../settings/settings.model';
import { UsersChatsService } from '../users-chats/users-chats.service';
import { AppFormDTO } from './app-form.dto';
import { FormsCommandsService } from './forms-commands.service';
import { Form } from './models/form.model';
import { FormPrev } from './models/form_prev.model';
import { NewForm } from './models/new_form.model';

@Injectable()
export class FormsService {
  constructor(
    private chatsService: UsersChatsService,
    private readonly commandsService: FormsCommandsService,
    @InjectModel(Form) private formRepository: typeof Form,
    @InjectModel(PhoneNumber) private phoneNumberRepository: typeof PhoneNumber,
    @InjectModel(Settings) private settingsRepository: typeof Settings,
    @InjectModel(NewForm)
    private newFormsRepository: typeof NewForm,
    @InjectModel(FormPrev)
    private prevFormsRepository: typeof FormPrev,
    @InjectModel(Contact)
    private contactsRepository: typeof Contact,
    private sequelize: Sequelize,
  ) {}

  /**
   * @deprecated используйте FormsCommandsService.continueRegistration
   */
  async continueRegistration(userId: string) {
    return this.commandsService.continueRegistration(userId);
  }

  /**
   * @deprecated используйте FormsCommandsService.approveNewForm
   */
  async approveNewForm(formInfo: AppFormDTO) {
    return this.commandsService.approveNewForm(formInfo);
  }

  /**
   * @deprecated используйте FormsCommandsService.createFormByAdmin
   */
  async createFormByAdmin(formInfo: AppFormDTO) {
    return this.commandsService.createFormByAdmin(formInfo);
  }

  /**
   * @deprecated используйте FormsCommandsService.rejectNewForm
   */
  async rejectNewForm(formInfo: AppFormDTO) {
    return this.commandsService.rejectNewForm(formInfo);
  }

  async getNewFormsForApproveList(botId?: string) {
    let newForms: NewForm[] = [];
    try {
      const where: WhereOptions<NewForm> =
        botId !== undefined ? { status: 'waiting', botId } : { status: 'waiting' };
      newForms = await this.newFormsRepository.findAll({ where });
    } catch {
      newForms = await this.newFormsRepository.findAll({ where: { status: 'waiting' } });
    }
    const res: Array<{ userId: string; systemName?: string | null }> = [];
    for (const formInf of newForms) {
      res.push({ userId: formInf.userId, systemName: formInf.systemName });
    }
    return res;
  }

  /**
   * @deprecated используйте FormsCommandsService.getUsersWithApprovedForm
   */
  async getUsersWithApprovedForm() {
    return this.commandsService.getUsersWithApprovedForm();
  }

  async searchUser(value: string, botId?: string) {
    const fields = ['phoneNumber', 'systemName', 'INN', 'city'];
    let forms: Form[] = [];

    for (const field of fields) {
      try {
        const where: WhereOptions<Form> = {
          [field]: { [Op.iLike]: `%${value}%` },
          ...(botId !== undefined ? { botId } : {}),
        } as unknown as WhereOptions<Form>;
        const form = await this.formRepository.findAll({ where });
        Array.prototype.push.apply(forms, form);
      } catch {
        const form = await this.formRepository.findAll({
          where: { [field]: { [Op.iLike]: `%${value}%` } } as unknown as WhereOptions<Form>,
        });
        Array.prototype.push.apply(forms, form);
      }
    }

    forms = forms.filter(
      (obj, index, self) => self.findIndex((o) => o.dataValues.id === obj.dataValues.id) === index,
    );

    const res = [];

    for (const form of forms) {
      const settings = await this.settingsRepository.findOne({
        where: {
          userId: form.userId,
        },
      });

      const formPlain = form ? form.get?.({ plain: true }) ?? (form as object) : ({} as object);
      const settingsPlain = settings ? settings.get?.({ plain: true }) ?? (settings as object) : null;

      res.push({ form: formPlain, settings: settingsPlain });
    }

    return res;
  }

  async searchUserById(id: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId: id, botId } : { userId: id };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId: id } });
    }

    const settings = await this.settingsRepository.findOne({
      where: {
        userId: id,
      },
    });

    const formPlain = form ? form.get?.({ plain: true }) ?? (form as object) : null;
    const settingsPlain = settings ? settings.get?.({ plain: true }) ?? (settings as object) : null;

    return { form: formPlain, settings: settingsPlain };
  }

  /**
   * @deprecated используйте FormsCommandsService.deleteUser
   */
  async deleteUser(userId: string) {
    return this.commandsService.deleteUser(userId);
  }

  /**
   * @deprecated используйте FormsCommandsService.checkNewRequests
   */
  async checkNewRequests() {
    return this.commandsService.checkNewRequests();
  }

  async getFreshCreatedForm(userId: string, botId?: string) {
    let res: NewForm | null = null;
    try {
      const where: WhereOptions<NewForm> =
        botId !== undefined ? { userId, status: 'created', botId } : { userId, status: 'created' };
      res = await this.newFormsRepository.findOne({ where });
    } catch {
      res = await this.newFormsRepository.findOne({ where: { userId, status: 'created' } });
    }

    return res;
  }

  /**
   * @deprecated используйте FormsCommandsService.userFilledNewForm
   */
  async userFilledNewForm(formInfo: AppFormDTO) {
    return this.commandsService.userFilledNewForm(formInfo);
  }

  async getFirstFilledForm(userId: string, botId?: string) {
    let form: NewForm | null = null;
    try {
      const where: WhereOptions<NewForm> =
        botId !== undefined ? { userId, status: 'waiting', botId } : { userId, status: 'waiting' };
      form = await this.newFormsRepository.findOne({ where });
    } catch {
      form = await this.newFormsRepository.findOne({ where: { userId, status: 'waiting' } });
    }

    if (form) {
      const formObj = form.toJSON();
      delete formObj.id;
      return formObj;
    }

    return form;
  }

  async getMainForm(userId: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId, botId } : { userId };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId } });
    }
    return form;
  }

  async getMainFormWithChats(userId: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId, botId } : { userId };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId } });
    }

    const chats = await this.chatsService.getUsersChats(userId);
    return { ...form?.dataValues, chats };
  }

  async getChangedFormsIds(botId?: string) {
    let forms: Form[] = [];
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { status: 'waiting', botId } : { status: 'waiting' };
      forms = await this.formRepository.findAll({ where });
    } catch {
      forms = await this.formRepository.findAll({ where: { status: 'waiting' } });
    }

    const res = [];
    for (const form of forms) {
      res.push({ userId: form.userId, systemName: form.systemName });
    }

    return res;
  }

  async getPrevForm(userId: string, botId?: string) {
    let form: FormPrev | null = null;
    try {
      const where: WhereOptions<FormPrev> = botId !== undefined ? { userId: userId, botId } : { userId: userId };
      form = await this.prevFormsRepository.findOne({ where });
    } catch {
      form = await this.prevFormsRepository.findOne({ where: { userId: userId } });
    }
    return form;
  }

  /**
   * @deprecated используйте FormsCommandsService.adminApprovesChangesInForm
   */
  async adminApprovesChangesInForm(formInfo: AppFormDTO) {
    return this.commandsService.adminApprovesChangesInForm(formInfo);
  }

  /**
   * @deprecated используйте FormsCommandsService.changeFormByUser
   */
  async changeFormByUser(form: AppFormDTO) {
    return this.commandsService.changeFormByUser(form);
  }

  /**
   * @deprecated используйте FormsCommandsService.checkNewFormsChanges
   */
  async checkNewFormsChanges() {
    return this.commandsService.checkNewFormsChanges();
  }

  async getAllFormsList(botId?: string) {
    let forms: Form[] = [];
    try {
      if (botId !== undefined) {
        const where: WhereOptions<Form> = { botId } as unknown as WhereOptions<Form>;
        forms = await this.formRepository.findAll({ where });
      } else {
        forms = await this.formRepository.findAll();
      }
    } catch {
      forms = await this.formRepository.findAll();
    }
    const res: Array<{ userId: string; systemName?: string | null }> = [];
    for (const form of forms) {
      res.push({ userId: form.userId, systemName: form.systemName });
    }
    return res;
  }

  /**
   * @deprecated используйте FormsCommandsService.registrationAdmin
   */
  async registrationAdmin(userId: string) {
    return this.commandsService.registrationAdmin(userId);
  }

  async isUserAuth(userId: string, botId?: string) {
    let user: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId: userId, botId } : { userId: userId };
      user = await this.formRepository.findOne({ where });
    } catch {
      user = await this.formRepository.findOne({ where: { userId: userId } });
    }
    return !!user;
  }

  // ================= Admin Drafts (server-side autosave) =================
  /**
   * Создать/обновить черновик админской формы. В качестве draftId используем uuid в поле userId таблицы NewForm.
   * Статус: 'admin_draft'.
   */
  async upsertAdminDraft(formInfo: AppFormDTO, draftId?: string) {
    const id = draftId || uuidv4();
    const payload = {
      ...formInfo,
      userId: id,
      status: 'admin_draft',
    };

    // upsert: если есть — обновим, иначе создадим
    const existing = await this.newFormsRepository.findOne({
      where: { userId: id, status: 'admin_draft' },
    });

    if (existing) {
      await this.newFormsRepository.update(payload, {
        where: { userId: id, status: 'admin_draft' },
      });
    } else {
      await this.newFormsRepository.create(payload);
    }

    return { draftId: id };
  }

  async getAdminDraft(draftId: string) {
    const draft = await this.newFormsRepository.findOne({
      where: { userId: draftId, status: 'admin_draft' },
    });
    return draft;
  }

  async deleteAdminDraft(draftId: string) {
    await this.newFormsRepository.destroy({
      where: { userId: draftId, status: 'admin_draft' },
    });
    return { ok: true };
  }
}
