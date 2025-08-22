import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';

import { Contact } from '../contacts/contact.model';
import { PhoneNumber } from '../phone-numbers/phone-number.model';
import { Settings } from '../settings/settings.model';
import { UsersChatsService } from '../users-chats/users-chats.service';
import { AppFormDTO } from './app-form.dto';
import { Form } from './models/form.model';
import { FormPrev } from './models/form_prev.model';
import { NewForm } from './models/new_form.model';

@Injectable()
export class FormsService {
  constructor(
    private chatsService: UsersChatsService,
    @InjectModel(Form) private formRepository: typeof Form,
    @InjectModel(PhoneNumber) private phoneNumberRepository: typeof PhoneNumber,
    @InjectModel(Settings) private settingsRepository: typeof Settings,
    @InjectModel(NewForm)
    private newFormsRepository: typeof NewForm,
    @InjectModel(FormPrev)
    private prevFormsRepository: typeof FormPrev,
    @InjectModel(Contact)
    private contactsRepository: typeof Contact,
  ) {}

  async continueRegistration(userId: string) {
    await this.settingsRepository.create({
      userId: userId,
      availability: true,
      accessAllTime: true,
    });

    const now = new Date();
    await this.newFormsRepository.update(
      {
        registrationDate: `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`,
      },
      {
        where: {
          userId,
        },
      },
    );
  }

  async approveNewForm(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const isNew = await this.formRepository.findOne({
      where: {
        userId: formInfo.userId,
      },
    });
    if (isNew) return;
    const form = {
      ...formInfo,
      status: 'approved',
      searchAvailability: true,
      isUserStarted: true,
      // Приведение типов
      surnameV: formInfo.surnameV ?? false,
      name: formInfo.name ?? '',
      nameV: formInfo.nameV ?? false,
      otchestvo: formInfo.otchestvo ?? '',
      otchestvoV: formInfo.otchestvoV ?? false,
      birthDate: formInfo.birthDate ?? '',
      birthDateV: formInfo.birthDateV ?? false,
      tgName: formInfo.tgName ?? '',
      tgNameV: formInfo.tgNameV ?? false,
      tgSurname: formInfo.tgSurname ?? '',
      tgSurnameV: formInfo.tgSurnameV ?? false,
      tgUserName: formInfo.tgUserName ?? '',
      tgUserNameV: formInfo.tgUserNameV ?? false,
      registrationDate: formInfo.registrationDate ?? '',
      constPhone: formInfo.constPhone ?? '',
      constPhoneV: formInfo.constPhoneV ?? false,
      // Преобразование строк в массивы
      organizations: formInfo.organizations ? formInfo.organizations : [],
      contacts: formInfo.contacts ? formInfo.contacts : [],
      tags: formInfo.tags || [],
      recommendations: formInfo.recommendations || [],
    };

    await this.formRepository.create({
      ...form,
      // botId попадёт из formInfo при наличии
    });

    await this.newFormsRepository.destroy({
      where: {
        userId: formInfo.userId,
      },
    });
  }

  async createFormByAdmin(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const isNew = await this.formRepository.findOne({
      where: {
        constPhone: formInfo.constPhone,
      },
    });
    if (isNew) return;
    const tempUserId = uuidv4();
    const form = {
      ...formInfo,
      userId: tempUserId,
      status: 'main',
      searchAvailability: true,
      isUserStarted: false,
      // Приведение типов
      surnameV: formInfo.surnameV ?? false,
      name: formInfo.name ?? '',
      nameV: formInfo.nameV ?? false,
      otchestvo: formInfo.otchestvo ?? '',
      otchestvoV: formInfo.otchestvoV ?? false,
      birthDate: formInfo.birthDate ?? '',
      birthDateV: formInfo.birthDateV ?? false,
      tgName: formInfo.tgName ?? '',
      tgNameV: formInfo.tgNameV ?? false,
      tgSurname: formInfo.tgSurname ?? '',
      tgSurnameV: formInfo.tgSurnameV ?? false,
      tgUserName: formInfo.tgUserName ?? '',
      tgUserNameV: formInfo.tgUserNameV ?? false,
      registrationDate: formInfo.registrationDate ?? '',
      constPhone: formInfo.constPhone ?? '',
      constPhoneV: formInfo.constPhoneV ?? false,
      // Преобразование строк в массивы
      organizations: formInfo.organizations ? formInfo.organizations : [],
      contacts: formInfo.contacts ? formInfo.contacts : [],
      tags: formInfo.tags || [],
      recommendations: formInfo.recommendations || [],
    };

    await this.formRepository.create({
      ...form,
    });

    return form;
  }

  async rejectNewForm(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const form = { ...formInfo, status: 'rejected' };

    try {
      await this.newFormsRepository.update(form, {
        where: {
          userId: formInfo.userId,
          ...(formInfo.botId !== undefined ? { botId: formInfo.botId } : {}),
        },
      });
    } catch {
      await this.newFormsRepository.update(form, {
        where: { userId: formInfo.userId },
      });
    }
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

  async getUsersWithApprovedForm() {
    const approvedForms = await this.formRepository.findAll({
      where: {
        status: 'approved',
      },
    });
    const res: Array<{ userId: string; status: string }> = [];
    for (const form of approvedForms) {
      res.push({ userId: form.userId, status: form.status });
      await this.formRepository.update(
        {
          status: 'main',
        },
        {
          where: {
            userId: form.userId,
            // без botId намеренно, для обратной совместимости перекидываем approved->main глобально
          },
        },
      );
    }
    return res;
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

  async deleteUser(userId: string) {
    await this.formRepository.destroy({
      where: {
        userId,
      },
    });

    await this.newFormsRepository.destroy({
      where: {
        userId,
      },
    });

    await this.prevFormsRepository.destroy({
      where: {
        userId,
      },
    });

    await this.settingsRepository.destroy({
      where: {
        userId,
      },
    });

    await this.phoneNumberRepository.destroy({
      where: {
        userId,
      },
    });

    await this.contactsRepository.destroy({
      where: {
        userId,
      },
    });
    await this.contactsRepository.destroy({
      where: {
        contactUserId: userId,
      },
    });

    try {
      //TODO ЗАГЛУШКА
      //await axios.get(process.env.BOT_URL + '/deleteUser/' + userId);
    } catch (e) {
      Logger.error(e as Error);
      return;
    }
  }

  async checkNewRequests() {
    const newForms = await this.newFormsRepository.findAll({
      where: {
        status: 'filled',
      },
    });

    await this.newFormsRepository.update(
      {
        status: 'waiting',
      },
      {
        where: {
          status: 'filled',
        },
      },
    );

    return newForms;
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

  async userFilledNewForm(formInfo: AppFormDTO) {
    const form = { ...formInfo, status: 'filled' };

    try {
      await this.newFormsRepository.update(
        { ...form },
        {
          where: {
            userId: String(formInfo.userId),
            status: 'created',
            ...(formInfo.botId !== undefined ? { botId: formInfo.botId } : {}),
          },
        },
      );
    } catch {
      await this.newFormsRepository.update(
        { ...form },
        {
          where: { userId: String(formInfo.userId), status: 'created' },
        },
      );
    }

    const chats = await this.chatsService.getChats();
    for (const chat of chats) {
      const res = await this.chatsService.checkUserMembership(chat, formInfo.userId);
      if (String(res) === 'true') await this.chatsService.setGroupToUser(formInfo.userId, chat);
    }
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

  async adminApprovesChangesInForm(formInfo: AppFormDTO) {
    const prev = await this.prevFormsRepository.findOne({
      where: {
        userId: formInfo.userId,
      },
    });
    if (prev) {
      await this.prevFormsRepository.destroy({
        where: {
          userId: formInfo.userId,
        },
      });
    }

    const form = { ...formInfo, status: 'main' };

    try {
      await this.formRepository.update(form, {
        where: {
          userId: form.userId,
          ...(formInfo.botId !== undefined ? { botId: formInfo.botId } : {}),
        },
      });
    } catch {
      await this.formRepository.update(form, {
        where: { userId: form.userId },
      });
    }
    return form;
  }

  async changeFormByUser(form: AppFormDTO) {
    const prev = await this.formRepository.findOne({
      where: {
        userId: form.userId,
      },
    });
    const data = prev?.dataValues;
    if (!data) return;
    const { status: _status, searchAvailability: _searchAvailability, ...newPrev } = data;
    await this.prevFormsRepository.upsert(newPrev);
    const updatedForm = { ...form, status: 'changed' };
    try {
      await this.formRepository.update(updatedForm, {
        where: {
          userId: form.userId,
          ...(form.botId !== undefined ? { botId: form.botId } : {}),
        },
      });
    } catch {
      await this.formRepository.update(updatedForm, {
        where: { userId: form.userId },
      });
    }
    return updatedForm;
  }

  async checkNewFormsChanges() {
    const res = await this.formRepository.findAll({
      where: {
        status: 'changed',
      },
    });

    for (const form of res) {
      await this.formRepository.update(
        {
          status: 'waiting',
        },
        {
          where: {
            userId: form.userId,
            status: 'changed',
          },
        },
      );
    }
    return !!res.length;
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

  async registrationAdmin(userId: string) {
    const form = await this.newFormsRepository.findOne({
      where: {
        userId: userId,
      },
    });

    await this.formRepository.create({
      ...form?.dataValues,
      status: 'main',
      searchAvailability: true,
      isUserStarted: true,
    });
    await this.newFormsRepository.destroy({
      where: {
        userId: userId,
      },
    });
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
