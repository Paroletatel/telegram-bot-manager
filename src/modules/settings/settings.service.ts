import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { SettingsDTO } from './settings.dto';
import { Settings } from './settings.model';

@Injectable()
export class SettingsService {
  constructor(@InjectModel(Settings) private settingsRepository: typeof Settings) {}

  async updateSetting(settingName: string, value: string, userId: string) {
    await this.settingsRepository.update(
      {
        [settingName]: value,
      },
      {
        where: {
          userId,
        },
      },
    );
  }

  async getUserSettings(userId: string) {
    return await this.settingsRepository.findOne({
      where: {
        userId,
      },
    });
  }

  async updateAllSettings(settings: SettingsDTO) {
    await this.settingsRepository.update(settings, {
      where: {
        userId: settings.userId,
      },
    });
  }

  async getCommonMessage(userId: string) {
    const settings = await this.settingsRepository.findOne({
      where: {
        userId,
      },
    });

    return settings ? settings.commonMessage : '';
  }
}
