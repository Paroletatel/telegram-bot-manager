import { Column, DataType, Model, Table } from 'sequelize-typescript';

import { ContactInterface } from '../interfaces/contact.interface';
import { OrganizationInterface } from '../interfaces/organization.interface';

export type newFormStatuses = 'created' | 'filled' | 'waiting' | 'rejected';
@Table({ tableName: 'newForms' })
export class NewForm extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  userId!: string;

  @Column({ type: DataType.TEXT })
  status!: newFormStatuses;

  @Column({ type: DataType.TEXT })
  systemName!: string;

  @Column({ type: DataType.TEXT })
  surname!: string;

  @Column({ type: DataType.BOOLEAN })
  surnameV!: boolean;

  @Column({ type: DataType.TEXT })
  name!: string;

  @Column({ type: DataType.BOOLEAN })
  nameV!: boolean;

  @Column({ type: DataType.TEXT })
  otchestvo!: string;

  @Column({ type: DataType.BOOLEAN })
  otchestvoV!: boolean;

  @Column({ type: DataType.TEXT })
  birthDate!: string;

  @Column({ type: DataType.BOOLEAN })
  birthDateV!: boolean;

  @Column({ type: DataType.TEXT })
  tgName!: string;

  @Column({ type: DataType.BOOLEAN })
  tgNameV!: boolean;

  @Column({ type: DataType.TEXT })
  tgSurname!: string;

  @Column({ type: DataType.BOOLEAN })
  tgSurnameV!: boolean;

  @Column({ type: DataType.TEXT })
  tgUserName!: string;

  @Column({ type: DataType.BOOLEAN })
  tgUserNameV!: boolean;

  @Column({ type: DataType.TEXT })
  registrationDate!: string;

  @Column({ type: DataType.TEXT })
  constPhone!: string;

  @Column({ type: DataType.BOOLEAN })
  constPhoneV!: boolean;

  @Column({ type: DataType.JSON })
  organizations!: OrganizationInterface[];

  @Column({ type: DataType.JSON })
  contacts!: ContactInterface[];

  @Column({ type: DataType.ARRAY(DataType.TEXT) })
  tags!: string[];

  @Column({ type: DataType.ARRAY(DataType.TEXT) })
  recommendations!: string[];

  // Изоляция по боту (опционально). Добавляется через sync({ alter: true }).
  @Column({ type: DataType.UUID, allowNull: true })
  botId?: string | null;
}
