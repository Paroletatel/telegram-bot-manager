import { Column, DataType, Index, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'user_chats' })
export class UserChat extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Index('uniq_user_chat_bot')
  @Column({ type: DataType.STRING, allowNull: false })
  userId!: string;

  @Index('uniq_user_chat_bot')
  @Column({ type: DataType.STRING, allowNull: false })
  chatId!: string;

  // Привязка к боту-владельцу. Оставляем nullable для совместимости (будет проставляться миграцией)
  @Index('uniq_user_chat_bot')
  @Column({ type: DataType.UUID, allowNull: true })
  botId?: string | null;
}
