import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { GroupService } from "../../services/group.service";

@Injectable()
export class MasterGroupManagementService {
  private readonly logger = new Logger(MasterGroupManagementService.name);

  constructor(
    @Inject(forwardRef(() => GroupService))
    private readonly groupService: GroupService
  ) {}

  async getGroupsInfo(): Promise<string> {
    try {
      const groups = this.groupService.getGroups();

      let text = "💬 **Зарегистрированные группы:**\n\n";

      if (groups.length === 0) {
        text += "❌ Нет зарегистрированных групп";
      } else {
        text += `📊 Всего групп: ${groups.length}\n\n`;
        groups.forEach((groupId, index) => {
          text += `${index + 1}. \`${groupId}\`\n`;
        });
      }

      text += `\n📅 Обновлено: ${new Date().toLocaleString("ru-RU")}`;

      return text;
    } catch (error) {
      this.logger.error("Ошибка получения информации о группах:", error);
      return "❌ Ошибка получения информации о группах";
    }
  }

  async addGroup(
    chatId: string,
    chatName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.groupService.addGroup(chatId, chatName);

      if (success) {
        await this.groupService.refreshGroups();
        return {
          success: true,
          message: `Группа "${chatName}" успешно добавлена`,
        };
      } else {
        return {
          success: false,
          message: `Не удалось добавить группу "${chatName}"`,
        };
      }
    } catch (error) {
      this.logger.error(`Ошибка добавления группы ${chatId}:`, error);
      return {
        success: false,
        message: `Ошибка добавления группы: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  async removeGroup(
    chatId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const success = await this.groupService.removeGroup(chatId);

      if (success) {
        await this.groupService.refreshGroups();
        return {
          success: true,
          message: `Группа ${chatId} успешно удалена`,
        };
      } else {
        return {
          success: false,
          message: `Не удалось удалить группу ${chatId}`,
        };
      }
    } catch (error) {
      this.logger.error(`Ошибка удаления группы ${chatId}:`, error);
      return {
        success: false,
        message: `Ошибка удаления группы: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  async getGroupDetails(
    chatId: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const groups = this.groupService.getGroups();
      const isRegistered = groups.includes(chatId);

      return {
        success: true,
        message: "Информация получена",
        data: {
          chatId,
          isRegistered,
          totalGroups: groups.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Ошибка получения информации о группе ${chatId}:`,
        error
      );
      return {
        success: false,
        message: `Ошибка получения информации о группе: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  async refreshGroups(): Promise<{ success: boolean; message: string }> {
    try {
      await this.groupService.refreshGroups();
      const groups = this.groupService.getGroups();

      return {
        success: true,
        message: `Список групп обновлен. Найдено ${groups.length} групп.`,
      };
    } catch (error) {
      this.logger.error("Ошибка обновления списка групп:", error);
      return {
        success: false,
        message: `Ошибка обновления списка групп: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
