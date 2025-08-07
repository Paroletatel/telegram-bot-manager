import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'usersChats' })
export class UsersChats extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  userId!: string;

  @Column({ type: DataType.ARRAY(DataType.STRING) })
  chatsIds!: string[];
}
