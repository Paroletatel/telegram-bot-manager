import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { z } from 'zod';

import { BotManagerCron } from './cron/bot-manager.cron';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BotsModule } from './modules/bots/bots.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { FormsModule } from './modules/forms/forms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PhoneNumbersModule } from './modules/phone-numbers/phone-numbers.module';
import { RolesModule } from './modules/roles/roles.module';
import { SearchModule } from './modules/search/search.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { UsersModule } from './modules/users/users.module';
import { UsersChatsModule } from './modules/users-chats/users-chats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, unknown>) => {
        const EnvSchema = z.object({
          NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
          PORT: z.coerce.number().int().positive().default(3000),
          JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
          DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
          MASTER_BOT_TOKEN: z.string().min(1, 'MASTER_BOT_TOKEN is required'),
          FRONTEND_URL: z.string().url().optional(),
          WEB_APP_URL: z.string().url().optional(),
          IS_SYNC_DB: z.coerce.boolean().default(false),
        });
        const parsed = EnvSchema.safeParse(config);
        if (!parsed.success) {
          throw new Error(parsed.error.toString());
        }
        return parsed.data;
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 20 },
      { name: 'auth-login', ttl: 10_000, limit: 5 },
      { name: 'auth-refresh', ttl: 60_000, limit: 10 },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    TelegramModule,
    ContactsModule,
    FormsModule,
    MessagesModule,
    PhoneNumbersModule,
    SearchModule,
    SettingsModule,
    UsersChatsModule,
    BotsModule,
  ],
  providers: [
    BotManagerCron,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
