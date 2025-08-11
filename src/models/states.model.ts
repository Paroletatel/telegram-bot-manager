import { Column, Model, Table, DataType, PrimaryKey } from 'sequelize-typescript';

interface StatesAttributes {
  chatId: string;
  text?: string | null;
  reply_keyboard?: string | null;
  inline_keyboard?: string | null;
  auth?: boolean;
}

interface StatesCreationAttributes {
  chatId: string;
  text?: string | null;
  reply_keyboard?: string | null;
  inline_keyboard?: string | null;
  auth?: boolean;
}

@Table({
  tableName: 'states',
  timestamps: true,
})
export class States extends Model<StatesAttributes, StatesCreationAttributes> {
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  chatId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  text?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  reply_keyboard?: string | null;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    defaultValue: null,
  })
  inline_keyboard?: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  })
  auth?: boolean;
}