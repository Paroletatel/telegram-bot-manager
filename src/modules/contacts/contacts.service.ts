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

  async addUserToContact(userId: string, contactUserId: string, botId?: string | null) {
    // Пытаемся работать в новой схеме (userId, contactUserId, botId)
    try {
      const where: any = botId !== undefined ? { userId, contactUserId, botId } : { userId, contactUserId };
      const existing = await this.contactRepository.findAll({ where });
      if (existing.length) return;
      await this.contactRepository.create({ userId, contactUserId, botId: botId ?? null } as any);
      return;
    } catch (_) {
      // Legacy fallback: без botId
      const existing = await this.contactRepository.findAll({ where: { userId, contactUserId } });
      if (existing.length) return;
      await this.contactRepository.create({ userId, contactUserId } as any);
    }
  }

  async getUsersContacts(userId: string, botId?: string | null) {
    let contacts: Contact[] = [];
    try {
      const where: any = botId !== undefined ? { userId, botId } : { userId };
      contacts = await this.contactRepository.findAll({ where });
    } catch (_) {
      // Legacy fallback: без botId
      contacts = await this.contactRepository.findAll({ where: { userId } });
    }

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

  async deleteUserFromContact(userId: string, contactUserId: string, botId?: string | null) {
    try {
      const where: any = botId !== undefined ? { userId, contactUserId, botId } : { userId, contactUserId };
      await this.contactRepository.destroy({ where });
    } catch (_) {
      // Legacy fallback
      await this.contactRepository.destroy({ where: { userId, contactUserId } });
    }
  }
}
