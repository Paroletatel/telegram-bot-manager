import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { Order, WhereOptions } from 'sequelize';

import { User } from '../../models';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  async findOrCreate(telegramId: string, userData: Partial<User> = {}): Promise<User> {
    const [user] = await this.userModel.findOrCreate({
      where: { telegramId },
      defaults: {
        firstName: userData.firstName || '',
        username: userData.username || '',
        ...userData,
      },
    });
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }

  async findAll(): Promise<User[]> {
    const order: Order = [['createdAt', 'DESC']];
    return this.userModel.findAll({ order });
  }

  async updateById(
    id: string,
    data: Partial<Pick<User, 'username' | 'firstName'>>,
  ): Promise<User | null> {
    const user = await this.userModel.findByPk(id);
    if (!user) return null;
    if (typeof data.username === 'string') user.username = data.username;
    if (typeof data.firstName === 'string') user.firstName = data.firstName;
    await user.save();
    return user;
  }

  async deleteById(id: string): Promise<boolean> {
    const where: WhereOptions<User> = { id } as unknown as WhereOptions<User>;
    const deleted = await this.userModel.destroy({ where });
    return deleted > 0;
  }
}
