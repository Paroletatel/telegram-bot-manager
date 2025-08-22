import { Column, DataType, Index,Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'chats' })
export class Chats extends Model {
  @Index({ name: 'uniq_chat_bot', unique: true })
  @Column({ type: DataType.STRING })
  chatId!: string;
  @Column({ type: DataType.STRING })
  chatName!: string;
  // Для мульти-ботов: идентификатор бота-владельца (опционально, для обратной совместимости)
  @Index({ name: 'uniq_chat_bot', unique: true })
  @Column({ type: DataType.UUID, allowNull: true })
  botId?: string | null;
}
