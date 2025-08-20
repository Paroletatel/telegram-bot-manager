import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'messages' })
export class Message extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  fromUserId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  fromUserName!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  toUserId!: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  text!: string;

  @Column({ type: DataType.BOOLEAN })
  isAuto!: boolean;

  @Column({ type: DataType.STRING })
  status!: string;

  // Изоляция по боту (опционально). Будет добавлена при sync({ alter: true }).
  @Column({ type: DataType.UUID, allowNull: true })
  botId?: string | null;
}
