import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { WhereOptions } from 'sequelize';

import { MembershipService } from '../telegram/worker-bot/services/membership.service';
import { Bot } from './bots.model';
import { Chats } from './chats.model';
import { UserChat } from './user-chat.model';
import { UsersChats } from './users-chats.model';

@Injectable()
export class UsersChatsService {
  private readonly logger = new Logger(UsersChatsService.name);
  constructor(
    @InjectModel(UsersChats) private usersChatsRepository: typeof UsersChats,
    @InjectModel(Chats) private chatsRepository: typeof Chats,
    @InjectModel(Bot) private botRepository: typeof Bot,
    @InjectModel(UserChat) private userChatRepository: typeof UserChat,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Миграция к мультибот-модели:
   * 1) Создаёт/находит запись мастер-бота на основе .env
   * 2) Проставляет его botId для всех чатов, у которых botId = NULL
   */
  async migrateToBotIds(): Promise<void> {
    try {
      const token = process.env.WORKER_BOT_TOKEN || process.env.BOT_TOKEN;
      const username = process.env.MASTER_BOT_USERNAME || 'master';

      if (!token) {
        this.logger.warn(
          'migrateToBotIds: переменная окружения WORKER_BOT_TOKEN/BOT_TOKEN не задана — пропускаю создание мастер-бота',
        );
        return;
      }

      // Находим по username, если нет — создаём; токен храним для запуска мульти-клиентов в будущем
      let master = await this.botRepository.findOne({ where: { username } });
      if (!master) {
        master = await this.botRepository.create({ username, token, status: 'active' as const });
        this.logger.log(`migrateToBotIds: создан мастер-бот id=${master.id} username=${username}`);
      } else {
        // Актуализируем токен при необходимости
        if (master.token !== token) {
          await this.botRepository.update({ token }, { where: { id: master.id } });
          this.logger.log(`migrateToBotIds: обновлён токен мастер-бота id=${master.id}`);
        }
      }

      // Массово проставляем botId там, где NULL
      const whereChatsNullBot: WhereOptions<Chats> = { botId: null } as unknown as WhereOptions<Chats>;
      const [affected] = await this.chatsRepository.update(
        { botId: master.id },
        { where: whereChatsNullBot },
      );
      this.logger.log(
        `migrateToBotIds: выставлен botId для чатов без владельца, affected=${affected}`,
      );
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
      this.logger.error('migrateToBotIds: ошибка миграции', errMsg);
    }
  }

  async setGroupToUser(userId: string, groupId: string) {
    this.logger.log(`setGroupToUser: userId=${userId}, groupId=${groupId}`);
    const usersGroups = await this.usersChatsRepository.findOne({
      where: {
        userId,
      },
    });

    this.logger.debug(
      `setGroupToUser: existing user record = ${usersGroups ? 'FOUND' : 'NOT_FOUND'}`,
    );
    const groups =
      usersGroups && usersGroups.chatsIds ? Array.from(new Set(usersGroups.chatsIds)) : [];
    const hadGroup = groups.includes(groupId);
    this.logger.debug(
      `setGroupToUser: current groups = [${groups.join(', ')}]; ${hadGroup ? 'already has' : 'will add'} ${groupId}`,
    );
    if (!hadGroup) {
      groups.push(groupId);
    } else {
      this.logger.debug(
        `setGroupToUser: skip adding duplicate groupId=${groupId} for userId=${userId}`,
      );
    }

    if (usersGroups) {
      const [affected] = await this.usersChatsRepository.update(
        { chatsIds: groups },
        {
          where: {
            userId,
          },
        },
      );
      this.logger.log(`setGroupToUser: updated userId=${userId}, affected=${affected}`);
    } else {
      const created = await this.usersChatsRepository.create({
        userId,
        chatsIds: groups,
      });
      this.logger.log(
        `setGroupToUser: created usersChats row id=${created.id} for userId=${userId}`,
      );
    }

    // Двойная запись в нормализованную таблицу user_chats (если существует)
    try {
      const chat = await this.chatsRepository.findOne({ where: { chatId: groupId } });
      const botId = chat?.botId ?? null;
      const ucWhere: WhereOptions<UserChat> = { userId, chatId: groupId, botId } as unknown as WhereOptions<UserChat>;
      const existingUC = await this.userChatRepository.findOne({ where: ucWhere });
      if (!existingUC) {
        await this.userChatRepository.create({ userId, chatId: groupId, botId });
        this.logger.log(
          `setGroupToUser: created UserChat(userId=${userId}, chatId=${groupId}, botId=${botId ?? 'null'})`,
        );
      }
    } catch (e: unknown) {
      // Таблица user_chats может ещё не существовать, если sync выключен — игнорируем
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.debug(
        `setGroupToUser: skip writing to user_chats (reason: ${msg})`,
      );
    }
  }

  async addChat(chatId: string, chatName: string, botId?: string | null) {
    this.logger.log(`addChat: chatId=${chatId}, chatName="${chatName}", botId=${botId ?? 'null'}`);
    // Пытаемся работать с botId (новая схема). При ошибке — fallback на legacy без botId
    try {
      const where: WhereOptions<Chats> = (botId !== undefined ? { chatId, botId } : { chatId }) as unknown as WhereOptions<Chats>;
      const existing = await this.chatsRepository.findOne({ where });
      if (existing) {
        const normalizedName = chatName || existing.chatName || '';
        if (normalizedName && normalizedName !== existing.chatName) {
          const [affected] = await this.chatsRepository.update(
            { chatName: normalizedName },
            { where },
          );
          this.logger.log(`addChat: updated chatName for chatId=${chatId}, affected=${affected}`);
        }
        this.logger.debug(`addChat: chat already exists, skipping create for chatId=${chatId}`);
        return;
      }
      const created = await this.chatsRepository.create({
        chatId,
        chatName: chatName || '',
        botId: botId ?? null,
      });
      this.logger.log(`addChat: created chat row id=${created.id} for chatId=${chatId}`);
      return;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`addChat: схема без botId? Перехожу в legacy-режим. Причина: ${msg}`);
      // Legacy: без botId
      const existingLegacy = await this.chatsRepository.findOne({ where: { chatId } });
      if (existingLegacy) {
        const normalizedName = chatName || existingLegacy.chatName || '';
        if (normalizedName && normalizedName !== existingLegacy.chatName) {
          const [affected] = await this.chatsRepository.update(
            { chatName: normalizedName },
            { where: { chatId } },
          );
          this.logger.log(
            `addChat(legacy): updated chatName for chatId=${chatId}, affected=${affected}`,
          );
        }
        this.logger.debug(
          `addChat(legacy): chat already exists, skipping create for chatId=${chatId}`,
        );
        return;
      }
      const createdLegacy = await this.chatsRepository.create({
        chatId,
        chatName: chatName || '',
      });
      this.logger.log(
        `addChat(legacy): created chat row id=${createdLegacy.id} for chatId=${chatId}`,
      );
    }
  }

  async getChats() {
    this.logger.debug('getChats: fetching all chats');
    const res = await this.chatsRepository.findAll();
    const ids = res.map((item) => item.chatId);
    this.logger.debug(`getChats: total=${ids.length}, ids=[${ids.join(', ')}]`);
    return ids;
  }

  async getChatsWithNames() {
    this.logger.debug('getChatsWithNames: fetching all chats with names');
    const res = await this.chatsRepository.findAll();
    this.logger.debug(`getChatsWithNames: total=${res.length}`);
    return res;
  }

  async getUsersChats(userId: string) {
    this.logger.debug(`getUsersChats: userId=${userId}`);
    const usersGroups = await this.usersChatsRepository.findOne({
      where: {
        userId,
      },
    });
    const legacyList = usersGroups?.chatsIds ? usersGroups.chatsIds : [];

    // Подмешиваем данные из нормализованной таблицы, если доступна
    let normalizedList: string[] = [];
    try {
      const rows = await this.userChatRepository.findAll({ where: { userId } });
      normalizedList = rows.map((r) => r.chatId);
    } catch {
      // Нет таблицы — ок, работаем только с legacy
    }

    // Объединяем и убираем дубликаты
    const set = new Set<string>([...legacyList, ...normalizedList]);
    const list = Array.from(set);
    this.logger.debug(`getUsersChats: found ${list.length} unique chatIds for userId=${userId}`);
    return list;
  }

  async getAvailableForUser(
    userId: string,
    options?: { verifyMembership?: boolean },
  ): Promise<{ chatId: string; chatName: string }[]> {
    // чаты пользователя
    const userChats = await this.getUsersChats(userId);
    if (!userChats.length) return [];

    // все зарегистрированные чаты, где есть бот
    const allBotChats = await this.chatsRepository.findAll();
    if (!allBotChats.length) return [];

    const botChatIds = new Set(allBotChats.map((c) => c.chatId));
    const intersection = userChats.filter((id) => botChatIds.has(id));
    if (!intersection.length) return [];

    // вернуть с именами
    let result = allBotChats
      .filter((c) => intersection.includes(c.chatId))
      .map((c) => ({ chatId: c.chatId, chatName: c.chatName || '' }));

    // optionally verify membership via Telegram API
    if (options?.verifyMembership) {
      const verified: { chatId: string; chatName: string }[] = [];
      for (const item of result) {
        try {
          const ok = await this.checkUserMembership(item.chatId, userId);
          if (ok) verified.push(item);
        } catch {
          // ignore failures, treat as not a member
        }
      }
      result = verified;
    }

    return result;
  }

  async checkUserMembership(chatId: string, userId: string): Promise<boolean> {
    this.logger.warn(`checkUserMembership called: chatId=${chatId}, userId=${userId}`);

    //return await this.membershipService.checkMembership(chatId, userId);
    //TODO пока не разобрался, использую заглушку
    return Promise.resolve(true);
  }
}
