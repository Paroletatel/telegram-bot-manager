import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { UsersChats } from "./users-chats.model";
import { Chats } from "./chats.model";
import { MembershipService } from "../telegram/worker-bot/services/membership.service";

@Injectable()
export class UsersChatsService {
  constructor(
    @InjectModel(UsersChats) private usersChatsRepository: typeof UsersChats,
    @InjectModel(Chats) private chatsRepository: typeof Chats,
    private readonly membershipService: MembershipService
  ) {}

  async setGroupToUser(userId: string, groupId: string) {
    const usersGroups = await this.usersChatsRepository.findOne({
      where: {
        userId,
      },
    });

    const groups =
      usersGroups && usersGroups.chatsIds ? usersGroups.chatsIds : [];
    groups.push(groupId);

    if (usersGroups) {
      await this.usersChatsRepository.update(
        { chatsIds: groups },
        {
          where: {
            userId,
          },
        }
      );
    } else {
      await this.usersChatsRepository.create({
        userId,
        chatsIds: groups,
      });
    }
  }

  async addChat(chatId: string, chatName: string) {
    await this.chatsRepository.create({ chatId, chatName });
  }

  async getChats() {
    const res = await this.chatsRepository.findAll();
    return res.map((item) => item.chatId);
  }

  async getChatsWithNames() {
    return await this.chatsRepository.findAll();
  }

  async getUsersChats(userId: string) {
    const usersGroups = await this.usersChatsRepository.findOne({
      where: {
        userId,
      },
    });
    return usersGroups?.chatsIds ? usersGroups.chatsIds : [];
  }

  async checkUserMembership(chatId: string, userId: string): Promise<boolean> {
    console.log(chatId, userId);
    
    //return await this.membershipService.checkMembership(chatId, userId);
    //TODO пока не разобрался, использую заглушку
    return Promise.resolve(true);
  }
}
