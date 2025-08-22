import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';

import { Settings } from '../settings/settings.model';
import { UsersChatsService } from '../users-chats/users-chats.service';
import { AppFormDTO } from './app-form.dto';
import { Form } from './models/form.model';
import { FormPrev } from './models/form_prev.model';
import { NewForm } from './models/new_form.model';

@Injectable()
export class FormsQueriesService {
  constructor(
    @InjectModel(Form) private formRepository: typeof Form,
    @InjectModel(Settings) private settingsRepository: typeof Settings,
    @InjectModel(NewForm) private newFormsRepository: typeof NewForm,
    @InjectModel(FormPrev) private prevFormsRepository: typeof FormPrev,
    private readonly chatsService: UsersChatsService,
  ) {}

  async getNewFormsForApproveList(
    botId?: string,
    page = 1,
    limit = 20,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
  ) {
    type SortableField = 'createdAt' | 'updatedAt' | 'systemName' | 'userId';
    const offset = Math.max(0, (Number(page) || 1) - 1) * (Number(limit) || 20);
    const perPage = Math.max(1, Math.min(100, Number(limit) || 20));
    const sortWhitelist: ReadonlyArray<SortableField> = ['createdAt', 'updatedAt', 'systemName', 'userId'];
    const sortField: SortableField = sortWhitelist.includes(sort as SortableField)
      ? (sort as SortableField)
      : 'createdAt';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const where: WhereOptions<NewForm> = botId !== undefined ? { status: 'waiting', botId } : { status: 'waiting' };

    const { rows, count } = await this.newFormsRepository.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [[sortField as string, sortOrder]],
    });

    const items = rows.map((f) => ({ userId: f.userId, systemName: f.systemName }));
    return { items, total: count, page: Number(page) || 1, limit: perPage };
  }

  async searchUser(
    value: string,
    botId?: string,
    page = 1,
    limit = 20,
    sort: string = 'systemName',
    order: 'asc' | 'desc' = 'asc',
  ) {
    type SortableField = 'systemName' | 'createdAt' | 'updatedAt' | 'userId';
    const fields = ['phoneNumber', 'systemName', 'INN', 'city'] as const;
    let forms: Form[] = [];

    for (const field of fields) {
      try {
        const where: WhereOptions<Form> = {
          [field]: { [Op.iLike]: `%${value}%` },
          ...(botId !== undefined ? { botId } : {}),
        } as unknown as WhereOptions<Form>;
        const form = await this.formRepository.findAll({ where });
        Array.prototype.push.apply(forms, form);
      } catch {
        const form = await this.formRepository.findAll({
          where: { [field]: { [Op.iLike]: `%${value}%` } } as unknown as WhereOptions<Form>,
        });
        Array.prototype.push.apply(forms, form);
      }
    }

    forms = forms.filter(
      (obj, index, self) => self.findIndex((o) => o.dataValues.id === obj.dataValues.id) === index,
    );

    // сортировка и пагинация по итоговому списку
    const sortWhitelist: ReadonlyArray<SortableField> = ['systemName', 'createdAt', 'updatedAt', 'userId'];
    const sortField: SortableField = sortWhitelist.includes(sort as SortableField)
      ? (sort as SortableField)
      : 'systemName';
    const sortOrder = order === 'desc' ? -1 : 1;

    type PlainForm = {
      systemName?: string | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      userId: string;
      [k: string]: unknown;
    };
    const plain: PlainForm[] = forms.map((f) => f.get({ plain: true }) as PlainForm);

    plain.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      return (av as string | number | Date) > (bv as string | number | Date) ? sortOrder : -sortOrder;
    });

    const offset = Math.max(0, (Number(page) || 1) - 1) * (Number(limit) || 20);
    const perPage = Math.max(1, Math.min(100, Number(limit) || 20));
    const paged = plain.slice(offset, offset + perPage);

    const res: Array<{ form: object; settings: object | null }> = [];

    for (const form of paged) {
      const settings = await this.settingsRepository.findOne({ where: { userId: String(form.userId) } });
      const settingsPlain = settings ? (settings.get?.({ plain: true }) as object) ?? (settings as object) : null;
      res.push({ form, settings: settingsPlain });
    }

    return { items: res, total: forms.length, page: Number(page) || 1, limit: perPage };
  }

  async searchUserById(id: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId: id, botId } : { userId: id };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId: id } });
    }

    const settings = await this.settingsRepository.findOne({ where: { userId: id } });

    const formPlain = form ? form.get?.({ plain: true }) ?? (form as object) : null;
    const settingsPlain = settings ? settings.get?.({ plain: true }) ?? (settings as object) : null;

    return { form: formPlain, settings: settingsPlain };
  }

  async getFreshCreatedForm(userId: string, botId?: string) {
    let res: NewForm | null = null;
    try {
      const where: WhereOptions<NewForm> =
        botId !== undefined ? { userId, status: 'created', botId } : { userId, status: 'created' };
      res = await this.newFormsRepository.findOne({ where });
    } catch {
      res = await this.newFormsRepository.findOne({ where: { userId, status: 'created' } });
    }
    return res;
  }

  async getFirstFilledForm(userId: string, botId?: string) {
    let form: NewForm | null = null;
    try {
      const where: WhereOptions<NewForm> =
        botId !== undefined ? { userId, status: 'waiting', botId } : { userId, status: 'waiting' };
      form = await this.newFormsRepository.findOne({ where });
    } catch {
      form = await this.newFormsRepository.findOne({ where: { userId, status: 'waiting' } });
    }

    if (form) {
      const { id: _id, ...rest } = form.toJSON() as Record<string, unknown>;
      return rest as unknown as AppFormDTO;
    }
    return form as unknown as AppFormDTO | null;
  }

  async getMainForm(userId: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId, botId } : { userId };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId } });
    }
    return form;
  }

  async getMainFormWithChats(userId: string, botId?: string) {
    let form: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId, botId } : { userId };
      form = await this.formRepository.findOne({ where });
    } catch {
      form = await this.formRepository.findOne({ where: { userId } });
    }
    const chats = await this.chatsService.getUsersChats(userId);
    return { ...(form?.dataValues as object | undefined), chats } as Record<string, unknown>;
  }

  async getChangedFormsIds(botId?: string) {
    let forms: Form[] = [];
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { status: 'waiting', botId } : { status: 'waiting' };
      forms = await this.formRepository.findAll({ where });
    } catch {
      forms = await this.formRepository.findAll({ where: { status: 'waiting' } });
    }
    const res: Array<{ userId: string; systemName?: string | null }> = [];
    for (const form of forms) {
      res.push({ userId: form.userId, systemName: form.systemName });
    }
    return res;
  }

  async getPrevForm(userId: string, botId?: string) {
    let form: FormPrev | null = null;
    try {
      const where: WhereOptions<FormPrev> = botId !== undefined ? { userId: userId, botId } : { userId: userId };
      form = await this.prevFormsRepository.findOne({ where });
    } catch {
      form = await this.prevFormsRepository.findOne({ where: { userId: userId } });
    }
    return form;
  }

  async getAllFormsList(
    botId?: string,
    page = 1,
    limit = 20,
    sort: string = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
  ) {
    type SortableField = 'createdAt' | 'updatedAt' | 'systemName' | 'userId';
    const offset = Math.max(0, (Number(page) || 1) - 1) * (Number(limit) || 20);
    const perPage = Math.max(1, Math.min(100, Number(limit) || 20));
    const sortWhitelist: ReadonlyArray<SortableField> = ['createdAt', 'updatedAt', 'systemName', 'userId'];
    const sortField: SortableField = sortWhitelist.includes(sort as SortableField)
      ? (sort as SortableField)
      : 'createdAt';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const where: WhereOptions<Form> = botId !== undefined ? ({ botId } as unknown as WhereOptions<Form>) : {};

    const { rows, count } = await this.formRepository.findAndCountAll({
      where,
      limit: perPage,
      offset,
      order: [[sortField as string, sortOrder]],
    });

    const items: Array<{ userId: string; systemName?: string | null }> = rows.map((form) => ({
      userId: form.userId,
      systemName: form.systemName,
    }));
    return { items, total: count, page: Number(page) || 1, limit: perPage };
  }

  async isUserAuth(userId: string, botId?: string) {
    let user: Form | null = null;
    try {
      const where: WhereOptions<Form> = botId !== undefined ? { userId: userId, botId } : { userId: userId };
      user = await this.formRepository.findOne({ where });
    } catch {
      user = await this.formRepository.findOne({ where: { userId: userId } });
    }
    return !!user;
  }
}
