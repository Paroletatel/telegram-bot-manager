import { Injectable } from '@nestjs/common';
import { PhoneNumber } from './phone-number.model';
import { InjectModel } from '@nestjs/sequelize';
import { Form } from '../forms/models/form.model';
import { NewForm } from '../forms/models/new_form.model';
import { formatPhoneNumber } from './format-phone.utils';

@Injectable()
export class PhoneNumbersService {
  constructor(
    @InjectModel(PhoneNumber) private phoneNumberRepository: typeof PhoneNumber,
    @InjectModel(Form) private formRepository: typeof Form,
    @InjectModel(NewForm) private newFormRepository: typeof NewForm,
  ) {}

  // Проверить существует ли номер телефона у нового участника
  async checkNewMember(userId: string) {
    const user = await this.phoneNumberRepository.findOne({
      where: {
        userId: userId,
      },
    });

    if (user) return 'exists';
    else return 'new';
  }

  // Создать нового участника регистрации
  // Находим соответствующую телефону форму
  // Если форма найдена, и есть данные (dataValues) то:
  // - создаем телефонный номер с статусом "Одобрено" и messageStatus: "отправлено"
  // - изменяем статус этой формы на "Одобрено"
  // иначе:
  // Создаем номер телефона со статусом "Новый"
  // Создаем новую форму со статусом "Создана"

  async createNewMemberToRegistration(
    userId: string,
    phoneNumber: string,
    userName: string,
    tgSurname: string,
    tgName: string,
    tgUserName: string,
  ) {
    const formatedPhoneNumber = formatPhoneNumber(phoneNumber);
    const adminCreatedForm = await this.formRepository.findOne({
      where: {
        constPhone: formatedPhoneNumber,
      },
    });
    if (adminCreatedForm && adminCreatedForm?.dataValues) {
      await this.phoneNumberRepository.create({
        userId: userId,
        userName: userName,
        phoneNumber: formatedPhoneNumber,
        phoneNumberStatus: 'approved',
        messageStatus: 'sended',
      });
      await this.formRepository.update(
        {
          userId: userId,
          isUserStarted: true,
          status: 'approved',
          tgName: tgName,
          tgSurname: tgSurname,
          tgUserName: tgUserName,
        },
        {
          where: {
            constPhone: formatedPhoneNumber,
          },
        },
      );
      return;
    }
    await this.phoneNumberRepository.create({
      userId: userId,
      userName: userName,
      phoneNumber: formatedPhoneNumber,
      phoneNumberStatus: 'new',
      messageStatus: null,
    });
    await this.newFormRepository.create({
      userId: String(userId),
      tgName: tgName,
      tgSurname: tgSurname,
      tgUserName: tgUserName,
      tgNameV: false,
      tgSurnameV: false,
      tgUserNameV: false,
      constPhone: formatedPhoneNumber,
      status: 'created',
      tags: [],
      organizations: [],
      recommendations: [],
      contacts: [],
    });
    return;
  }

  // Получить список новых номеров
  async getNewNumbersList() {
    const newMembers = await this.phoneNumberRepository.findAll({
      where: {
        phoneNumberStatus: 'new',
      },
    });
    return newMembers;
  }

  // Проверить новые номера
  // отобрать номера со статусом "новый" и messageStatus null
  // и при этом поменять messageStatus на "для отправки"
  async checkNewPhones() {
    const newPhones = await this.phoneNumberRepository.findAll({
      where: {
        phoneNumberStatus: 'new',
        messageStatus: null,
      },
    });

    await this.phoneNumberRepository.update(
      {
        messageStatus: 'forSend',
      },
      {
        where: {
          phoneNumberStatus: 'new',
          messageStatus: null,
        },
      },
    );

    return newPhones;
  }

  // Изменить статус номера
  // меняем phoneNumberStatus на переданный статус
  // и при этом меняем messageStatus на "для отправки"
  async changeNumberStatus(phoneNumber: string, status: string) {
    const formatedPhoneNumber = formatPhoneNumber(phoneNumber);
    await this.phoneNumberRepository.update(
      {
        phoneNumberStatus: status,
        messageStatus: 'forSend',
      },
      {
        where: {
          phoneNumber: formatedPhoneNumber,
        },
      },
    );
  }

  // Получить список новых одобренных номеров
  // отобрать номера со статусом "одобрено" и messageStatus "для отправки"
  async getNewApprovedList() {
    const res = await this.phoneNumberRepository.findAll({
      where: {
        messageStatus: 'forSend',
        phoneNumberStatus: 'approved',
      },
    });

    return res;
  }

  // Изменить статус сообщения
  // меняем messageStatus на "отправлено"
  async setMessageStatus(userId: string) {
    await this.phoneNumberRepository.update(
      { messageStatus: 'sended' },
      {
        where: {
          userId: userId,
        },
      },
    );
  }
}
