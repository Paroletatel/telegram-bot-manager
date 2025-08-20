import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'contacts' })
export class Contact extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  contactUserId!: string;

  // Для мультиботов: опциональная изоляция по владельцу-боту
  @Column({ type: DataType.UUID, allowNull: true })
  botId?: string | null;
}
