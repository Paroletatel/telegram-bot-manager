import { User } from '@/models';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';


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
        ...userData
      }
    });
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id);
  }
}
