import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Message } from "./message.model";
import { Form } from "../forms/models/form.model";
import { Settings } from "../settings/settings.model";
import { Op } from "sequelize";
import {
  getCurrentHourInTimezone,
  getDayOfTheWeek,
} from "./utils/get-day-of-the-week";

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message) private messagesRepository: typeof Message,
    @InjectModel(Form) private formsRepository: typeof Form,
    @InjectModel(Settings) private settingsRepository: typeof Settings
  ) {}

  async createNewMessage(fromUserId: string, toUserId: string, text: string) {
    const fromUserInfo = await this.formsRepository.findOne({
      where: {
        userId: fromUserId,
      },
    });

    await this.messagesRepository.create({
      fromUserId,
      fromUserName: `${fromUserInfo?.name} ${fromUserInfo?.surname} (${fromUserInfo?.systemName}) `,
      toUserId,
      text,
      status: "new",
      isAuto: false,
    });

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
      await this.messagesRepository.create({
        fromUserId: toUserId,
        fromUserName: toUserInfo?.systemName,
        toUserId: fromUserId,
        text:
          "(Это автоматическое сообщение) " + toUserAutoMessage?.autoMessage,
        status: "new",
        isAuto: true,
      });
    }
  }

  async getNewMessages() {
    const messages = await this.messagesRepository.findAll({
      where: {
        status: "new",
      },
    });

    const users = messages.map((obj) => obj["toUserId"]).flat();

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
        ? user.accessTimeStart.split(":")
        : [null, null];
      const { userEndHours, userEndMinutes } = user.accessTimeEnd
        ? user.accessTimeEnd.split(":")
        : [null, null];
      if (
        (!user.accessDays || user.accessDays.includes(currentDay)) &&
        user.availability == true
      ) {
        if (
          user.accessAllTime ||
          userStartHours === null ||
          userStartMinutes === null ||
          (currentHour >= Number(userStartHours) &&
            currentMinutes > Number(userStartMinutes) &&
            currentHour <= Number(userEndHours) &&
            currentMinutes < Number(userEndMinutes))
        ) {
          const message = messages.filter(
            (mess) => mess.toUserId === user.userId
          );
          messagesToSend = messagesToSend.concat(messages);
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
      }
    );
  }

  async getNewMessagesForUser(userId: string) {
    let ret = [];
    const messages = await this.messagesRepository.findAll({
      where: {
        toUserId: userId,
        status: "sended",
      },
    });

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
