import { Column, Model, Table, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt } from 'sequelize-typescript';

@Table({
  tableName: 'telegram_bots',
  timestamps: true,
})
export class TelegramBot extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
  })
  token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default({})
  @Column(DataType.JSONB)
  config: any;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
