import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

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
