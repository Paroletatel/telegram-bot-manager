import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
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
export class FormsCommandsService {
  constructor(
    @InjectModel(Form) private formRepository: typeof Form,
    @InjectModel(PhoneNumber) private phoneNumberRepository: typeof PhoneNumber,
    @InjectModel(Settings) private settingsRepository: typeof Settings,
    @InjectModel(NewForm) private newFormsRepository: typeof NewForm,
    @InjectModel(FormPrev) private prevFormsRepository: typeof FormPrev,
    @InjectModel(Contact) private contactsRepository: typeof Contact,
    private readonly chatsService: UsersChatsService,
    private sequelize: Sequelize,
  ) {}

  async continueRegistration(userId: string) {
    const t = await this.sequelize.transaction();
    try {
      await this.settingsRepository.create(
        { userId, availability: true, accessAllTime: true },
        { transaction: t },
      );

      const now = new Date();
      await this.newFormsRepository.update(
        { registrationDate: `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}` },
        { where: { userId }, transaction: t },
      );

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async approveNewForm(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const isNew = await this.formRepository.findOne({ where: { userId: formInfo.userId } });
    if (isNew) return;
    const form = {
      ...formInfo,
      status: 'approved',
      searchAvailability: true,
      isUserStarted: true,
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
      organizations: formInfo.organizations ? formInfo.organizations : [],
      contacts: formInfo.contacts ? formInfo.contacts : [],
      tags: formInfo.tags || [],
      recommendations: formInfo.recommendations || [],
    };

    const t = await this.sequelize.transaction();
    try {
      await this.formRepository.create({ ...form }, { transaction: t });
      await this.newFormsRepository.destroy({ where: { userId: formInfo.userId }, transaction: t });
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async createFormByAdmin(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const isNew = await this.formRepository.findOne({ where: { constPhone: formInfo.constPhone } });
    if (isNew) return;
    const tempUserId = uuidv4();
    const form = {
      ...formInfo,
      userId: tempUserId,
      status: 'main',
      searchAvailability: true,
      isUserStarted: false,
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
      organizations: formInfo.organizations ? formInfo.organizations : [],
      contacts: formInfo.contacts ? formInfo.contacts : [],
      tags: formInfo.tags || [],
      recommendations: formInfo.recommendations || [],
    };

    await this.formRepository.create({ ...form });
    return form;
  }

  async getUsersWithApprovedForm() {
    const approvedForms = await this.formRepository.findAll({ where: { status: 'approved' } });
    const res: Array<{ userId: string; status: string }> = [];
    for (const form of approvedForms) {
      res.push({ userId: form.userId, status: form.status });
      await this.formRepository.update(
        { status: 'main' },
        { where: { userId: form.userId } },
      );
    }
    return res;
  }

  async rejectNewForm(formInfo: AppFormDTO) {
    if (!formInfo) return;
    const form = { ...formInfo, status: 'rejected' } as AppFormDTO & { status: string };
    try {
      await this.newFormsRepository.update(form as Partial<NewForm>, {
        where: { userId: formInfo.userId, ...(formInfo.botId !== undefined ? { botId: formInfo.botId } : {}) },
      });
    } catch {
      await this.newFormsRepository.update(form as Partial<NewForm>, { where: { userId: formInfo.userId } });
    }
  }

  async userFilledNewForm(formInfo: AppFormDTO) {
    const form = { ...formInfo, status: 'filled' } as AppFormDTO & { status: string };
    try {
      await this.newFormsRepository.update(
        { ...form } as Partial<NewForm>,
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
        { ...form } as Partial<NewForm>,
        { where: { userId: String(formInfo.userId), status: 'created' } },
      );
    }

    const chats = await this.chatsService.getChats();
    for (const chat of chats) {
      const res = await this.chatsService.checkUserMembership(chat, formInfo.userId);
      if (String(res) === 'true') await this.chatsService.setGroupToUser(formInfo.userId, chat);
    }
  }

  async adminApprovesChangesInForm(formInfo: AppFormDTO) {
    const prev = await this.prevFormsRepository.findOne({ where: { userId: formInfo.userId } });
    if (prev) {
      // удаление предыдущей формы в транзакции произойдёт ниже
    }

    const form = { ...formInfo, status: 'main' } as AppFormDTO & { status: string };

    const t = await this.sequelize.transaction();
    try {
      if (prev) {
        await this.prevFormsRepository.destroy({ where: { userId: formInfo.userId }, transaction: t });
      }

      try {
        await this.formRepository.update(form as Partial<Form>, {
          where: { userId: form.userId, ...(formInfo.botId !== undefined ? { botId: formInfo.botId } : {}) },
          transaction: t,
        });
      } catch {
        await this.formRepository.update(form as Partial<Form>, {
          where: { userId: form.userId },
          transaction: t,
        });
      }

      await t.commit();
      return form;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async changeFormByUser(form: AppFormDTO) {
    const prev = await this.formRepository.findOne({ where: { userId: form.userId } });
    const data = prev?.dataValues;
    if (!data) return;
    const { status: _status, searchAvailability: _searchAvailability, ...newPrev } = data as Record<string, unknown>;
    const t = await this.sequelize.transaction();
    try {
      await this.prevFormsRepository.upsert(newPrev as Partial<FormPrev>, { transaction: t });
      const updatedForm = { ...form, status: 'changed' } as AppFormDTO & { status: string };
      try {
        await this.formRepository.update(updatedForm as Partial<Form>, {
          where: { userId: form.userId, ...(form.botId !== undefined ? { botId: form.botId } : {}) },
          transaction: t,
        });
      } catch {
        await this.formRepository.update(updatedForm as Partial<Form>, {
          where: { userId: form.userId },
          transaction: t,
        });
      }
      await t.commit();
      return updatedForm;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async deleteUser(userId: string) {
    const t = await this.sequelize.transaction();
    try {
      await this.formRepository.destroy({ where: { userId }, transaction: t });
      await this.newFormsRepository.destroy({ where: { userId }, transaction: t });
      await this.prevFormsRepository.destroy({ where: { userId }, transaction: t });
      await this.settingsRepository.destroy({ where: { userId }, transaction: t });
      await this.phoneNumberRepository.destroy({ where: { userId }, transaction: t });
      await this.contactsRepository.destroy({ where: { userId }, transaction: t });
      await this.contactsRepository.destroy({ where: { contactUserId: userId }, transaction: t });
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  async checkNewRequests() {
    const newForms = await this.newFormsRepository.findAll({ where: { status: 'filled' } });
    await this.newFormsRepository.update(
      { status: 'waiting' } as Partial<NewForm>,
      { where: { status: 'filled' } },
    );
    return newForms;
  }

  async checkNewFormsChanges() {
    const res = await this.formRepository.findAll({ where: { status: 'changed' } });
    for (const form of res) {
      await this.formRepository.update(
        { status: 'waiting' } as Partial<Form>,
        { where: { userId: form.userId, status: 'changed' } },
      );
    }
    return !!res.length;
  }

  async registrationAdmin(userId: string) {
    const form = await this.newFormsRepository.findOne({ where: { userId } });
    const t = await this.sequelize.transaction();
    try {
      await this.formRepository.create(
        {
          ...(form?.dataValues as object),
          status: 'main',
          searchAvailability: true,
          isUserStarted: true,
        } as Partial<Form>,
        { transaction: t },
      );
      await this.newFormsRepository.destroy({ where: { userId }, transaction: t });
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }
}
