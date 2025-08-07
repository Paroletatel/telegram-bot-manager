import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'settings' })
export class Settings extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  userId!: string;

  @Column({ type: DataType.STRING })
  accessDays!: string;

  @Column({ type: DataType.STRING })
  accessTimeStart!: string;

  @Column({ type: DataType.STRING })
  accessTimeEnd!: string;
  @Column({ type: DataType.BOOLEAN })
  accessAllTime!: boolean;

  @Column({ type: DataType.STRING })
  timezone!: string;

  @Column({ type: DataType.TEXT })
  commonMessage!: string;

  @Column({ type: DataType.TEXT })
  autoMessage!: string;

  @Column({ type: DataType.BOOLEAN })
  availability!: boolean;
}
