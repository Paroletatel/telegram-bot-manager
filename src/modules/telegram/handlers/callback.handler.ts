import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";
import { ICallbackHandler } from "../interfaces/message-handler.interface";
import { StateService } from "../services/state.service";
import { KeyboardService } from "../services/keyboard.service";
import {
  RegistrationService,
  MemberStatus,
} from "../services/registration.service";
import { GroupService } from "../services/group.service";
import { UsersService } from "../../users/users.service";

@Injectable()
export class MainCallbackHandler implements ICallbackHandler {
  private readonly logger = new Logger(MainCallbackHandler.name);

  constructor(
    private readonly stateService: StateService,
    private readonly keyboardService: KeyboardService,
    private readonly registrationService: RegistrationService,
    private readonly groupService: GroupService,
    private readonly usersService: UsersService
  ) {}

  canHandle(callbackData: string): boolean {
    const handledCallbacks = [
      "profile",
      "settings",
      "stats",
      "help",
      "back_to_main",
      "manage_users",
      "admin_stats",
      "manage_groups",
      "addGroup",
      "pending_registrations",
      "request_contact",
    ];
    return handledCallbacks.includes(callbackData);
  }

  async handle(
    bot: TelegramBot,
    query: TelegramBot.CallbackQuery,
    botId: string
  ): Promise<void> {
    if (!query.message || !("chat" in query.message) || !query.data) return;

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const callbackData = query.data;

    try {
      switch (callbackData) {
        case "addGroup":
          await this.handleAddGroup(bot, chatId, messageId);
          break;

        case "back_to_main":
          await this.handleBackToMain(bot, chatId, messageId);
          break;

        case "request_contact":
          await this.handleRequestContact(bot, chatId, messageId);
          break;

        case "pending_registrations":
          await this.handlePendingRegistrations(bot, chatId, messageId);
          break;

        case "profile":
          await this.handleProfile(bot, query, botId);
          break;

        case "stats":
          await this.handleStats(bot, chatId, messageId);
          break;

        case "manage_groups":
          await this.handleManageGroups(bot, chatId, messageId);
          break;

        default:
          await this.handleDefault(bot, chatId, callbackData);
      }

      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      this.logger.error("Ошибка обработки callback:", error);
      await bot.answerCallbackQuery(query.id, { text: "❌ Произошла ошибка" });
    }
  }

  private async handleAddGroup(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    await this.stateService.updateState(chatId.toString(), {
      text: "addGroup",
      reply_keyboard: null,
      inline_keyboard: null,
    });

    await bot.editMessageText(
      "➕ Добавление группы\n\nОтправьте ID группы (его можно получить, добавив бота в группу и отправив команду /group)",
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Назад", callback_data: "back_to_main" }],
          ],
        },
      }
    );
  }

  private async handleBackToMain(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    await this.stateService.updateState(chatId.toString(), {
      text: undefined,
      reply_keyboard: undefined,
      inline_keyboard: undefined,
    });

    await this.keyboardService.sendKeyboard(bot, chatId, "adminsMenu");
    await bot.deleteMessage(chatId, messageId);
  }

  private async handleRequestContact(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    await this.stateService.updateState(chatId.toString(), {
      reply_keyboard: "startRegistration",
    });

    await bot.editMessageText(
      "📱 Регистрация\n\nНажмите кнопку ниже, чтобы отправить свой контакт:",
      {
        chat_id: chatId,
        message_id: messageId,
      }
    );

    await bot.sendMessage(chatId, "Отправьте контакт:", {
      reply_markup: this.keyboardService.createContactKeyboard(),
    });
  }

  private async handlePendingRegistrations(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    const pendingMembers = await this.registrationService.getPendingMembers();

    let text = "📋 **Заявки на регистрацию:**\n\n";

    if (pendingMembers.length === 0) {
      text += "✅ Нет ожидающих заявок";
    } else {
      pendingMembers.slice(0, 10).forEach((member, index) => {
        text += `${index + 1}. **${member.fullName}**\n`;
        text += `📱 ${member.phoneNumber}\n`;
        text += `💬 @${member.username || "без username"}\n`;
        text += `🆔 ${member.chatId}\n\n`;
      });

      if (pendingMembers.length > 10) {
        text += `... и еще ${pendingMembers.length - 10} заявок`;
      }
    }

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔄 Обновить", callback_data: "pending_registrations" },
            { text: "🔙 Назад", callback_data: "back_to_main" },
          ],
        ],
      },
    });
  }

  private async handleProfile(
    bot: TelegramBot,
    query: TelegramBot.CallbackQuery,
    botId: string
  ): Promise<void> {
    if (!query.from || !query.message || !("chat" in query.message)) return;

    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const telegramId = query.from.id.toString();

    try {
      const user = await this.usersService.findByTelegramId(telegramId);
      const memberStatus = await this.registrationService.getMemberStatus(
        chatId.toString()
      );

      let profileText = "👤 **Ваш профиль:**\n\n";

      if (user) {
        profileText += `🏷 Имя: ${user.firstName || "Не указано"}\n`;
        profileText += `📝 Username: @${user.username || "не указан"}\n`;
        profileText += `🆔 ID: ${user.id}\n`;
      }

      if (memberStatus) {
        const statusEmoji = {
          pending: "⏳ Ожидает",
          approved: "✅ Одобрен",
          rejected: "❌ Отклонен",
        };
        profileText += `📊 Статус: ${
          statusEmoji[memberStatus] || memberStatus
        }\n`;
      }

      if (this.registrationService.isAdmin(chatId.toString())) {
        profileText += "👑 Права: Администратор\n";
      }

      profileText += `📅 Telegram ID: ${telegramId}`;

      await bot.editMessageText(profileText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Назад", callback_data: "back_to_main" }],
          ],
        },
      });
    } catch (error) {
      this.logger.error("Ошибка получения профиля:", error);
    }
  }

  private async handleStats(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    try {
      const groups = this.groupService.getGroups();
      const pendingMembers = await this.registrationService.getPendingMembers();

      let statsText = "📊 **Статистика системы:**\n\n";
      statsText += `💬 Активных групп: ${groups.length}\n`;
      statsText += `⏳ Заявок на рассмотрении: ${pendingMembers.length}\n`;
      statsText += `🤖 Статус бота: Активен\n`;
      statsText += `📅 Обновлено: ${new Date().toLocaleString("ru-RU")}`;

      await bot.editMessageText(statsText, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Обновить", callback_data: "stats" },
              { text: "🔙 Назад", callback_data: "back_to_main" },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error("Ошибка получения статистики:", error);
    }
  }

  private async handleManageGroups(
    bot: TelegramBot,
    chatId: number,
    messageId: number
  ): Promise<void> {
    const groups = this.groupService.getGroups();

    let text = "💬 **Управление группами:**\n\n";

    if (groups.length === 0) {
      text += "❌ Нет зарегистрированных групп";
    } else {
      text += `📊 Всего групп: ${groups.length}\n\n`;
      groups.slice(0, 5).forEach((groupId, index) => {
        text += `${index + 1}. \`${groupId}\`\n`;
      });

      if (groups.length > 5) {
        text += `... и еще ${groups.length - 5} групп`;
      }
    }

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Добавить группу", callback_data: "addGroup" }],
          [
            { text: "🔄 Обновить", callback_data: "manage_groups" },
            { text: "🔙 Назад", callback_data: "back_to_main" },
          ],
        ],
      },
    });
  }

  private async handleDefault(
    bot: TelegramBot,
    chatId: number,
    callbackData: string
  ): Promise<void> {
    await bot.sendMessage(chatId, `🔧 Функция "${callbackData}" в разработке`);
  }
}
