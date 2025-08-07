import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Contact } from './contact.model';
import { Form } from '../forms/models/form.model';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact) private contactRepository: typeof Contact,
    @InjectModel(Form) private formRepository: typeof Form,
  ) {}

  async addUserToContact(userId: string, contactUserId: string) {
    const contact = await this.contactRepository.findAll({
      where: {
        userId,
        contactUserId,
      },
    });
    if (contact.length) return;
    else {
      await this.contactRepository.create({
        userId,
        contactUserId,
      });
      return;
    }
  }

  async getUsersContacts(userId: string) {
    const contacts = await this.contactRepository.findAll({
      where: {
        userId,
      },
    });

    if (!contacts.length) return [];

    let contactNames = [];
    for (const contact of contacts) {
      const info = await this.formRepository.findOne({
        where: {
          userId: contact.contactUserId,
        },
      });

      contactNames.push({ systemName: info?.systemName, userId: info?.userId });
    }

    return contactNames;
  }

  async deleteUserFromContact(userId: string, contactUserId: string) {
    await this.contactRepository.destroy({
      where: {
        userId,
        contactUserId,
      },
    });
  }
}
