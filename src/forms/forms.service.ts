import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Form } from './models/form.model';
import { PhoneNumber } from '../phone-numbers/phone_number.model';
import { Op } from 'sequelize';
import { Settings } from '../settings/settings.model';
import { AppFormDTO } from './app_form.dto';
import { NewForm } from './models/new_form.model';
import { FormPrev } from './models/form_prev.model';
import { v4 as uuidv4 } from 'uuid';
import { Contact } from '../contacts/contact.model';
import { UsersChatsService } from '../users-chats/users_chats.service';
import axios from 'axios';
import * as process from 'node:process';

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
        registrationDate: `${now.getDate()}.${
          now.getMonth() + 1
        }.${now.getFullYear()}`,
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

    await this.newFormsRepository.update(form, {
      where: {
        userId: formInfo.userId,
      },
    });
  }

  async getNewFormsForApproveList() {
    const newForms = await this.newFormsRepository.findAll({
      where: {
        status: 'waiting',
      },
    });
    const res = [];
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
    const res = [];
    for (const form of approvedForms) {
      res.push({ userId: form.userId, status: form.status });
      await this.formRepository.update(
        {
          status: 'main',
        },
        {
          where: {
            userId: form.userId,
          },
        },
      );
    }
    return res;
  }

  async searchUser(value: string) {
    const fields = ['phoneNumber', 'systemName', 'INN', 'city'];
    let forms: Form[] = [];

    for (const field of fields) {
      const form = await this.formRepository.findAll({
        where: {
          [field]: {
            [Op.iLike]: `%${value}%`,
          },
        },
      });
      Array.prototype.push.apply(forms, form);
    }

    forms = forms.filter(
      (obj, index, self) =>
        self.findIndex((o) => o.dataValues.id === obj.dataValues.id) === index,
    );

    const res = [];

    for (const form of forms) {
      const settings = await this.settingsRepository.findOne({
        where: {
          userId: form.userId,
        },
      });

      res.push({ form: form, settings: settings });
    }

    return res;
  }

  async searchUserById(id: string) {
    const form = await this.formRepository.findOne({
      where: {
        userId: id,
      },
    });

    const settings = await this.settingsRepository.findOne({
      where: {
        userId: id,
      },
    });

    return { form: form, settings: settings };
  }

  async deleteUser(userId: string) {
    const form = await this.formRepository.findOne({
      where: {
        userId,
      },
    });

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
      await axios.get(process.env.BOT_URL + '/deleteUser/' + userId);
    } catch (e) {
      console.error(e);
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

  async getFreshCreatedForm(userId: string) {
    const res = await this.newFormsRepository.findOne({
      where: {
        userId,
        status: 'created',
      },
    });

    return res;
  }

  async userFilledNewForm(formInfo: AppFormDTO) {
    const form = { ...formInfo, status: 'filled' };

    await this.newFormsRepository.update(
      {
        ...form,
      },
      {
        where: {
          userId: String(formInfo.userId),
          status: 'created',
        },
      },
    );

    const chats = await this.chatsService.getChats();
    for (const chat of chats) {
      const res = await this.chatsService.checkMembership(
        chat,
        formInfo.userId,
      );
      if (String(res) === 'true')
        await this.chatsService.setGroupToUser(formInfo.userId, chat);
    }
  }

  async getFirstFilledForm(userId: string) {
    const form = await this.newFormsRepository.findOne({
      where: {
        userId,
        status: 'waiting',
      },
    });

    if (form) {
      const formObj = form.toJSON();
      delete formObj.id;
      return formObj;
    }

    return form;
  }

  async getMainForm(userId: string) {
    const form = await this.formRepository.findOne({
      where: {
        userId,
      },
    });
    return form;
  }

  async getMainFormWithChats(userId: string) {
    const form = await this.formRepository.findOne({
      where: {
        userId,
      },
    });

    const chats = await this.chatsService.getUsersChats(userId);
    return { ...form?.dataValues, chats };
  }

  async getChangedFormsIds() {
    const forms = await this.formRepository.findAll({
      where: {
        status: 'waiting',
      },
    });

    const res = [];
    for (const form of forms) {
      res.push({ userId: form.userId, systemName: form.systemName });
    }

    return forms;
  }

  async getPrevForm(userId: string) {
    const form = await this.prevFormsRepository.findOne({
      where: {
        userId: userId,
      },
    });
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

    await this.formRepository.update(form, {
      where: {
        userId: form.userId,
      },
    });
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
    const { status, searchAvailability, ...newPrev } = data;
    await this.prevFormsRepository.upsert(newPrev);
    const updatedForm = { ...form, status: 'changed' };
    await this.formRepository.update(updatedForm, {
      where: {
        userId: form.userId,
      },
    });
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

  async getAllFormsList() {
    const forms = await this.formRepository.findAll();
    const res = [];
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

  async isUserAuth(userId: string) {
    const user = await this.formRepository.findOne({
      where: {
        userId: userId,
      },
    });
    return !!user;
  }
}
