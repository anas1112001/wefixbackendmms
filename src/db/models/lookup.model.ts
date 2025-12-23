import { DataTypes } from 'sequelize';
import { BelongsTo, Column, CreatedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

import { User } from './user.model';

import { getDate, getIsoTimestamp, setDate } from '../../lib';

export enum LookupCategory {
  BUSINESS_MODEL = 'BusinessModel',
  COMPANY_ROLE = 'CompanyRole',
  COUNTRY = 'Country',
  ESTABLISHED_TYPE = 'EstablishedType',
  MAIN_SERVICE = 'MainService',
  MANAGED_BY = 'ManagedBy',
  STATE = 'State',
  SUB_SERVICE = 'SubService',
  TOOL = 'Tool',
  USER_ROLE = 'UserRole',
  TICKET_CODE = 'TicketCode',
  TICKET_TYPE = 'TicketType',
  TICKET_STATUS = 'TicketStatus',
  TICKET_TIME = 'TicketTime',
  RESPONSE_TIME = 'ResponseTime',
  TICKET_PROCESS = 'TicketProcess',
}

@Table({
  modelName: 'Lookup',
  tableName: 'lookups',
  underscored: true,
})
export class Lookup extends Model {
  @Column({
    allowNull: false,
    primaryKey: true,
    type: DataTypes.INTEGER,
  })
  public id: number;

  @Column({
    allowNull: false,
    type: DataTypes.ENUM({ values: Object.values(LookupCategory) }),
  })
  public category: LookupCategory;

  @Column({
    allowNull: false,
    type: DataTypes.STRING(100),
  })
  public name: string;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(100),
  })
  public nameArabic: string | null;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(100),
  })
  public code: string | null;

  @Column({
    allowNull: true,
    type: DataTypes.TEXT,
  })
  public description: string | null;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(500),
    comment: 'Icon/image path for the service (e.g., /WeFixFiles/Icons/electrical.png)',
  })
  public icon: string | null;

  @Column({
    allowNull: true,
    comment: 'JSON array of entity permissions (e.g., ["Companies", "Contracts", "Tickets"])',
    type: DataTypes.TEXT,
  })
  public permissions: string | null;

  @Column({
    allowNull: false,
    defaultValue: 0,
    type: DataTypes.INTEGER,
  })
  public orderId: number;

  @Column({
    allowNull: false,
    defaultValue: false,
    type: DataTypes.BOOLEAN,
  })
  public isDefault: boolean;

  @Column({
    allowNull: false,
    defaultValue: true,
    type: DataTypes.BOOLEAN,
  })
  public isActive: boolean;

  @ForeignKey(() => Lookup)
  @Column({
    allowNull: true,
    type: DataTypes.INTEGER,
  })
  public parentLookupId: number | null;

  @BelongsTo(() => Lookup, { foreignKey: 'parentLookupId', as: 'parent' })
  public parent: Lookup;

  @CreatedAt
  @Column({
    allowNull: false,
    comment: 'Lookup created DateTime',
    defaultValue: getIsoTimestamp,
    get: getDate('createdAt'),
    set: setDate('createdAt'),
    type: DataTypes.DATE,
  })
  public createdAt: Date;

  @UpdatedAt
  @Column({
    allowNull: false,
    comment: 'Lookup updated DateTime',
    defaultValue: getIsoTimestamp,
    get: getDate('updatedAt'),
    set: setDate('updatedAt'),
    type: DataTypes.DATE,
  })
  public updatedAt: Date;

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who created this record',
    type: DataTypes.INTEGER,
  })
  public createdBy: number | null;

  @BelongsTo(() => User, { foreignKey: 'createdBy', as: 'creator' })
  public creator?: User | null;

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who last updated this record',
    type: DataTypes.INTEGER,
  })
  public updatedBy: number | null;

  @BelongsTo(() => User, { foreignKey: 'updatedBy', as: 'updater' })
  public updater?: User | null;

  @Column({
    allowNull: true,
    comment: 'DateTime when record was deleted',
    get: getDate('deletedAt'),
    set: setDate('deletedAt'),
    type: DataTypes.DATE,
  })
  public deletedAt: Date | null;

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who deleted this record',
    type: DataTypes.INTEGER,
  })
  public deletedBy: number | null;

  @BelongsTo(() => User, { foreignKey: 'deletedBy', as: 'deleter' })
  public deleter?: User | null;

  @Column({
    allowNull: false,
    comment: 'Whether the record is deleted (soft delete)',
    defaultValue: false,
    type: DataTypes.BOOLEAN,
  })
  public isDeleted: boolean;
}

