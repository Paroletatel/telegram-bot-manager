import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WhereOptions } from 'sequelize';

import { Form } from '../forms/models/form.model';
import { Contact } from './contact.model';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact) private contactRepository: typeof Contact,
    @InjectModel(Form) private formRepository: typeof Form,
  ) {}

  async addUserToContact(userId: string, contactUserId: string, botId?: string | null) {
    // Пытаемся работать в новой схеме (userId, contactUserId, botId)
    try {
      const where: WhereOptions<Contact> =
        botId !== undefined ? { userId, contactUserId, botId } : { userId, contactUserId };
      const existing = await this.contactRepository.findAll({ where });
      if (existing.length) return;
      await this.contactRepository.create({ userId, contactUserId, botId: botId ?? null });
      return;
    } catch {
      // Legacy fallback: без botId
      const existing = await this.contactRepository.findAll({ where: { userId, contactUserId } });
      if (existing.length) return;
      await this.contactRepository.create({ userId, contactUserId });
    }
  }

  async getUsersContacts(userId: string, botId?: string | null) {
    let contacts: Contact[] = [];
    try {
      const where: WhereOptions<Contact> = botId !== undefined ? { userId, botId } : { userId };
      contacts = await this.contactRepository.findAll({ where });
    } catch {
      // Legacy fallback: без botId
      contacts = await this.contactRepository.findAll({ where: { userId } });
    }

    if (!contacts.length) return [];

    const contactNames: Array<{ systemName?: string | null; userId?: string }> = [];
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

  async deleteUserFromContact(userId: string, contactUserId: string, botId?: string | null) {
    try {
      const where: WhereOptions<Contact> =
        botId !== undefined ? { userId, contactUserId, botId } : { userId, contactUserId };
      await this.contactRepository.destroy({ where });
    } catch {
      // Legacy fallback
      await this.contactRepository.destroy({ where: { userId, contactUserId } });
    }
  }
}
