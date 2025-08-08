import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkerBotService } from '../../worker-bot/worker-bot.service';
import { RegistrationService } from '../../services/registration.service';
import { GroupService } from '../../services/group.service';

@Injectable()
export class MasterStatsService {
  private readonly logger = new Logger(MasterStatsService.name);

  constructor(
    @Inject(forwardRef(() => WorkerBotService))
    private readonly workerBotService: WorkerBotService,
    @Inject(forwardRef(() => RegistrationService))
    private readonly registrationService: RegistrationService,
    @Inject(forwardRef(() => GroupService))
    private readonly groupService: GroupService,
  ) {}

  async getSystemStats(): Promise<string> {
    try {
      const stats = await this.workerBotService.getBotStats();
      const pendingMembers = await this.registrationService.getPendingMembers();

      return `
📊 **Статистика системы**

🤖 **Боты:**
• Всего: ${stats.totalBots}
• Активных: ${stats.activeBots}

💬 **Группы:** ${stats.totalGroups}
📋 **Ожидающие заявки:** ${pendingMembers.length}

📈 **Детали ботов:**
${stats.botDetails.map(bot => 
  `• $${bot.name}: $${bot.isActive ? '🟢' : '🔴'} ${bot.lastActivity ? '(активен: ' + new Date(bot.lastActivity).toLocaleString('ru-RU') + ')' : ''}`
).join('\n')}

📅 **Обновлено:** ${new Date().toLocaleString('ru-RU')}
      `;
    } catch (error) {
      this.logger.error('Ошибка сбора статистики:', error);
      return '❌ Ошибка получения статистики системы';
    }
  }

  async getHealthReport(): Promise<string> {
    try {
      const activeBots = this.workerBotService.getActiveBots();
      const allBots = this.workerBotService.getAllBots();
      
      // Проверка базы данных
      let databaseHealth = false;
      try {
        await this.registrationService.getPendingMembers();
        databaseHealth = true;
      } catch (error) {
        this.logger.error('База данных недоступна:', error);
      }

      const healthStatus = this.calculateOverallHealth(allBots.length, activeBots.length, databaseHealth);
      const statusEmoji = healthStatus === 'healthy' ? '🟢' : healthStatus === 'degraded' ? '🟡' : '🔴';

      return `
🏥 **Отчет о состоянии системы**

${statusEmoji} **Общий статус:** ${this.translateHealthStatus(healthStatus)}

🤖 **Боты:** ${activeBots.length}/${allBots.length} активных
🗄️ **База данных:** ${databaseHealth ? '🟢 Доступна' : '🔴 Недоступна'}
📊 **Память:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB используется
⏱️ **Время работы:** ${Math.round(process.uptime())} сек

📅 **Время проверки:** ${new Date().toLocaleString('ru-RU')}
      `;
    } catch (error) {
      this.logger.error('Ошибка получения отчета о здоровье:', error);
      return '❌ Ошибка получения отчета о состоянии системы';
    }
  }

  async getBotsInfo(): Promise<string> {
    try {
      const bots = this.workerBotService.getAllBots();
      
      let message = '🤖 **Состояние ботов:**\n\n';
      
      if (bots.length === 0) {
        message += '❌ Нет активных ботов';
      } else {
        bots.forEach(bot => {
          message += `• **${bot.name}**\n`;
          message += `  ID: \`${bot.id}\`\n`;
          message += `  Статус: ${bot.isActive ? '🟢 Активен' : '🔴 Неактивен'}\n`;
          message += `  Создан: ${bot.createdAt.toLocaleString('ru-RU')}\n`;
          if (bot.lastActivity) {
            message += `  Последняя активность: ${bot.lastActivity.toLocaleString('ru-RU')}\n`;
          }
          message += '\n';
        });
      }

      return message;
    } catch (error) {
      this.logger.error('Ошибка получения информации о ботах:', error);
      return '❌ Ошибка получения информации о ботах';
    }
  }

  private calculateOverallHealth(totalBots: number, activeBots: number, databaseHealth: boolean): 'healthy' | 'degraded' | 'unhealthy' {
    if (!databaseHealth) {
      return 'unhealthy';
    }
    
    if (totalBots === 0 || activeBots === 0) {
      return 'degraded';
    }
    
    const botHealthRatio = activeBots / totalBots;
    if (botHealthRatio >= 0.8) {
      return 'healthy';
    } else if (botHealthRatio >= 0.5) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  private translateHealthStatus(status: string): string {
    const translations = {
      'healthy': 'Здоров',
      'degraded': 'Частично работоспособен', 
      'unhealthy': 'Неработоспособен'
    };
    return translations[status as keyof typeof translations] || status;
  }
}