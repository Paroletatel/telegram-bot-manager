import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';

import { Form } from '../forms/models/form.model';
import { Settings } from '../settings/settings.model';
import { Message } from './message.model';
import { getCurrentHourInTimezone, getDayOfTheWeek } from './utils/get-day-of-the-week';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message) private messagesRepository: typeof Message,
    @InjectModel(Form) private formsRepository: typeof Form,
    @InjectModel(Settings) private settingsRepository: typeof Settings,
  ) {}

  async createNewMessage(
    fromUserId: string,
    toUserId: string,
    text: string,
    botId?: string | null,
  ) {
    const fromUserInfo = await this.formsRepository.findOne({
      where: {
        userId: fromUserId,
      },
    });

    // Сначала пытаемся создать с botId, при ошибке (нет колонки) пробуем без него
    try {
      await this.messagesRepository.create({
        fromUserId,
        fromUserName: `${fromUserInfo?.name} ${fromUserInfo?.surname} (${fromUserInfo?.systemName}) `,
        toUserId,
        text,
        status: 'new',
        isAuto: false,
        botId: botId ?? null,
      });
    } catch {
      await this.messagesRepository.create({
        fromUserId,
        fromUserName: `${fromUserInfo?.name} ${fromUserInfo?.surname} (${fromUserInfo?.systemName}) `,
        toUserId,
        text,
        status: 'new',
        isAuto: false,
      });
    }

    const toUserInfo = await this.formsRepository.findOne({
      where: {
        userId: toUserId,
      },
    });

    const toUserAutoMessage = await this.settingsRepository.findOne({
      where: {
        userId: toUserId,
      },
    });

    if (toUserAutoMessage && toUserAutoMessage.autoMessage) {
      try {
        await this.messagesRepository.create({
          fromUserId: toUserId,
          fromUserName: toUserInfo?.systemName,
          toUserId: fromUserId,
          text: '(Это автоматическое сообщение) ' + toUserAutoMessage?.autoMessage,
          status: 'new',
          isAuto: true,
          botId: botId ?? null,
        });
      } catch {
        await this.messagesRepository.create({
          fromUserId: toUserId,
          fromUserName: toUserInfo?.systemName,
          toUserId: fromUserId,
          text: '(Это автоматическое сообщение) ' + toUserAutoMessage?.autoMessage,
          status: 'new',
          isAuto: true,
        });
      }
    }
  }

  async getNewMessages(botId?: string | null) {
    let messages: Message[] = [];
    try {
      const where: WhereOptions<Message> =
        botId !== undefined ? ({ status: 'new', botId } as WhereOptions<Message>) : ({ status: 'new' } as WhereOptions<Message>);
      messages = await this.messagesRepository.findAll({
        where,
      });
    } catch {
      messages = await this.messagesRepository.findAll({
        where: { status: 'new' },
      });
    }

    const users: string[] = messages.map((m) => m.toUserId);

    const usersSettings = await this.settingsRepository.findAll({
      where: {
        userId: {
          [Op.in]: users,
        },
      },
    });

    let messagesToSend: Message[] = [];

    for (const userInfo of usersSettings) {
      const user = userInfo.dataValues;
      const timezone = user.timezone;
      const currentDay = getDayOfTheWeek(timezone);
      const currentTime = getCurrentHourInTimezone(timezone);
      const currentHour = currentTime.hour;
      const currentMinutes = currentTime.minutes;
      const [userStartHours, userStartMinutes] = user.accessTimeStart
        ? user.accessTimeStart.split(':')
        : [null, null];
      const [userEndHours, userEndMinutes] = user.accessTimeEnd
        ? user.accessTimeEnd.split(':')
        : [null, null];
      if ((!user.accessDays || user.accessDays.includes(currentDay)) && user.availability == true) {
        const sH = userStartHours !== null ? Number(userStartHours) : null;
        const sM = userStartMinutes !== null ? Number(userStartMinutes) : null;
        const eH = userEndHours !== null ? Number(userEndHours) : null;
        const eM = userEndMinutes !== null ? Number(userEndMinutes) : null;

        const withinWindow = (() => {
          if (user.accessAllTime) return true;
          if (sH === null || sM === null || eH === null || eM === null) return true; // неполные настройки — пропускаем
          // Сравнение в пределах одного дня, включая границы
          const afterStart = currentHour > sH || (currentHour === sH && currentMinutes >= sM);
          const beforeEnd = currentHour < eH || (currentHour === eH && currentMinutes <= eM);
          return afterStart && beforeEnd;
        })();

        if (withinWindow) {
          const filteredMessages = messages.filter((mess) => mess.toUserId === user.userId);
          messagesToSend = messagesToSend.concat(filteredMessages);
        }
      }
    }

    return messagesToSend;
  }

  async changeMessageStatus(status: string, messageId: number) {
    await this.messagesRepository.update(
      {
        status,
      },
      {
        where: {
          id: messageId,
        },
      },
    );
  }

  async getNewMessagesForUser(userId: string, botId?: string | null) {
    const ret: Array<{ systemName?: string; id: string; fromUserId: string; text: string }> = [];
    let messages: Message[] = [];
    try {
      const where: WhereOptions<Message> = (botId !== undefined
        ? { toUserId: userId, status: 'sended', botId }
        : { toUserId: userId, status: 'sended' }) as WhereOptions<Message>;
      messages = await this.messagesRepository.findAll({ where });
    } catch {
      messages = await this.messagesRepository.findAll({
        where: { toUserId: userId, status: 'sended' },
      });
    }

    for (const message of messages) {
      const user = await this.formsRepository.findOne({
        where: {
          userId: message.fromUserId,
        },
      });
      ret.push({
        systemName: user?.systemName,
        id: String(message.id),
        fromUserId: message.fromUserId,
        text: message.text,
      });
    }

    return ret;
  }

  async getMessageById(messageId: number) {
    const message = await this.messagesRepository.findOne({
      where: {
        id: messageId,
      },
    });

    return message;
  }
}
