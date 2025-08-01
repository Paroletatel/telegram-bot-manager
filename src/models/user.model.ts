import { Table, Column, Model, DataType, PrimaryKey, Default, HasMany, CreatedAt, UpdatedAt, BelongsToMany } from 'sequelize-typescript';
import { RoleBot } from './role-bot.model';
import { RoleType } from './role-type.model';
import { TelegramBot } from './telegram-bot.model';

@Table({ 
  tableName: 'users',
  timestamps: true,
  underscored: true
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    field: 'telegram_id'
  })
  telegramId!: string;

  @Column({
    type: DataType.STRING,
    field: 'first_name'
  })
  firstName!: string;

  @Column(DataType.STRING)
  username!: string;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt!: Date;

  // Связь с RoleBot (один ко многим)
  @HasMany(() => RoleBot, 'user_id')
  roleBots: RoleBot[] = [];
  
  // Связь с RoleType через RoleBot (многие ко многим)
  @BelongsToMany(() => RoleType, () => RoleBot, 'user_id', 'role_type_code')
  roles: RoleType[] = [];
  
  // Связь с TelegramBot через RoleBot (многие ко многим)
  @BelongsToMany(() => TelegramBot, () => RoleBot, 'user_id', 'bot_id')
  bots: TelegramBot[] = [];
}
