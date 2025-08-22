import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'phoneNumbers' })
export class PhoneNumber extends Model {
  @Column({ type: DataType.STRING, unique: true })
  userId!: string;

  @Column({ type: DataType.TEXT })
  userName!: string;

  @Column({ type: DataType.TEXT, unique: true })
  phoneNumber!: string;

  @Column({ type: DataType.TEXT })
  phoneNumberStatus!: string;

  @Column({ type: DataType.TEXT })
  messageStatus!: string;
}
