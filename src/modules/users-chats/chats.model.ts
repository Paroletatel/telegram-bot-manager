import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'сhats' })
export class Chats extends Model {
  @Column({ type: DataType.STRING })
  chatId!: string;
  @Column({ type: DataType.STRING })
  chatName!: string;
}
