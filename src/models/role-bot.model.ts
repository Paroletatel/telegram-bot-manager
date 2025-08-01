import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';
import { User } from './user.model';
import { TelegramBot } from './telegram-bot.model';
import { RoleType } from './role-type.model';
import { RoleTypeEnum } from './role-type.enum';

@Table({ 
  tableName: 'role_bots',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'bot_id'],
      name: 'role_bots_user_id_bot_id_unique'
    },
    {
      fields: ['user_id'],
      name: 'role_bots_user_id_idx'
    },
    {
      fields: ['bot_id'],
      name: 'role_bots_bot_id_idx'
    },
    {
      fields: ['role_type_code'],
      name: 'role_bots_role_type_code_idx'
    }
  ]
})
export class RoleBot extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'user_id'
  })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => TelegramBot)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'bot_id'
  })
  botId!: string;

  @BelongsTo(() => TelegramBot)
  bot!: TelegramBot;

  @ForeignKey(() => RoleType)
  @Column({
    type: DataType.ENUM(...Object.values(RoleTypeEnum)),
    allowNull: false,
    field: 'role_type_code'
  })
  roleTypeCode!: RoleTypeEnum;

  @BelongsTo(() => RoleType, {
    foreignKey: 'role_type_code',
    targetKey: 'code'
  })
  roleType!: RoleType;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;
}
