import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'bots' })
export class Bot extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({ type: DataType.STRING, unique: true })
  username!: string;

  // ВНИМАНИЕ: хранение токена в базе допустимо для MVP; позже можно шифровать/вынести в vault
  @Column({ type: DataType.STRING })
  token!: string;

  @Column({ type: DataType.STRING, defaultValue: 'active' })
  status!: 'active' | 'disabled';
}
