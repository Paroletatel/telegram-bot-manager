import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { v4 as uuidv4 } from 'uuid';

import { AppFormDTO } from './app-form.dto';
import { NewForm } from './models/new_form.model';

@Injectable()
export class FormsDraftsService {
  constructor(
    @InjectModel(NewForm)
    private readonly newFormsRepository: typeof NewForm,
  ) {}

  // Создать/обновить черновик админской формы. В качестве draftId используем uuid в поле userId таблицы NewForm.
  async upsertAdminDraft(formInfo: AppFormDTO, draftId?: string) {
    const id = draftId || uuidv4();
    const payload = {
      ...formInfo,
      userId: id,
      // статус 'admin_draft' хранится в БД как текст, модель NewForm не знает об этом дополнительном значении
      // поэтому приводим тип через unknown -> Partial<NewForm>
      status: 'admin_draft',
    } as unknown as Partial<NewForm> & { userId: string; status: string };

    const existing = await this.newFormsRepository.findOne({
      where: { userId: id, status: 'admin_draft' },
    });

    if (existing) {
      await this.newFormsRepository.update(payload, {
        where: { userId: id, status: 'admin_draft' },
      });
    } else {
      // sequelize create ожидает атрибуты создания, используем приведение типов для совместимости
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.newFormsRepository.create(payload as any);
    }

    return { draftId: id };
  }

  async getAdminDraft(draftId: string) {
    const draft = await this.newFormsRepository.findOne({
      where: { userId: draftId, status: 'admin_draft' },
    });
    return draft;
  }

  async deleteAdminDraft(draftId: string) {
    await this.newFormsRepository.destroy({
      where: { userId: draftId, status: 'admin_draft' },
    });
    return { ok: true };
  }
}
