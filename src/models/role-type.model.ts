import { Table, Column, Model, DataType, PrimaryKey, HasMany, CreatedAt, BelongsToMany } from 'sequelize-typescript';
import { RoleBot } from './role-bot.model';
import { RoleTypeEnum } from './role-type.enum';
import { User } from './user.model';
import { TelegramBot } from './telegram-bot.model';

@Table({ 
  tableName: 'role_types',
  timestamps: true,
  underscored: true
})
export class RoleType extends Model {
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    field: 'code'
  })
  code!: RoleTypeEnum;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name: string = '';

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description: string | null = null;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;

  // Связь с RoleBot (один ко многим)
  @HasMany(() => RoleBot, 'role_type_code')
  roleBots: RoleBot[] = [];
  
  // Связь с User через RoleBot (многие ко многим)
  @BelongsToMany(() => User, () => RoleBot, 'role_type_code', 'user_id')
  users: User[] = [];
  
  // Связь с TelegramBot через RoleBot (многие ко многим)
  @BelongsToMany(() => TelegramBot, () => RoleBot, 'role_type_code', 'bot_id')
  bots: TelegramBot[] = [];
  
}
