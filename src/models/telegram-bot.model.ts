import { Column, Model, Table, DataType, PrimaryKey, Default, CreatedAt, UpdatedAt, HasMany, BelongsToMany } from 'sequelize-typescript';
import { RoleBot } from './role-bot.model';
import { User } from './user.model';
import { RoleType } from './role-type.model';

@Table({
  tableName: 'telegram_bots',
  timestamps: true,
  underscored: true
})
export class TelegramBot extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @Column({
    type: DataType.STRING,
    unique: true,
    allowNull: false,
    field: 'token'
  })
  token!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'name'
  })
  name!: string;

  @Default(true)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_active'
  })
  isActive!: boolean;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt!: Date;

  // Связь с RoleBot (один ко многим)
  @HasMany(() => RoleBot, 'bot_id')
  roleBots: RoleBot[] = [];
  
  // Связь с User через RoleBot (многие ко многим)
  @BelongsToMany(() => User, () => RoleBot, 'bot_id', 'user_id')
  users: User[] = [];
  
  // Связь с RoleType через RoleBot (многие ко многим)
  @BelongsToMany(() => RoleType, () => RoleBot, 'bot_id', 'role_type_code')
  roleTypes: RoleType[] = [];
  
  // Инициализация свойств для TypeScript strict mode
  constructor(values?: any, options?: any) {
    super(values, options);
    this.roleBots = [];
    this.users = [];
    this.roleTypes = [];
  }
}
