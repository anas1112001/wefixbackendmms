import { DataTypes } from 'sequelize';
import { BelongsTo, Column, CreatedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript';

import { Branch } from './branch.model';
import { Company } from './company.model';
import { Contract } from './contract.model';
import { Lookup } from './lookup.model';
import { User } from './user.model';
import { Zone } from './zone.model';

import { getDate, getIsoTimestamp, setDate } from '../../lib';

@Table({
  modelName: 'Ticket',
  tableName: 'tickets',
  underscored: true,
})
export class Ticket extends Model {
  @Column({
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  })
  public id: number;

  @Column({
    allowNull: false,
    type: DataTypes.STRING(50),
    comment: 'Alphanumeric ticket code with company shortcode (e.g., COMP001-TKT-001)',
  })
  public ticketCodeId: string;

  @ForeignKey(() => Company)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public companyId: number;

  @BelongsTo(() => Company, { foreignKey: 'companyId', as: 'company' })
  public company: Company;

  @ForeignKey(() => Contract)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public contractId: number;

  @BelongsTo(() => Contract, { foreignKey: 'contractId', as: 'contract' })
  public contract: Contract;

  @ForeignKey(() => Branch)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public branchId: number;

  @BelongsTo(() => Branch, { foreignKey: 'branchId', as: 'branch' })
  public branch: Branch;

  @ForeignKey(() => Zone)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public zoneId: number;

  @BelongsTo(() => Zone, { foreignKey: 'zoneId', as: 'zone' })
  public zone: Zone;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(255),
  })
  public locationMap: string | null;

  @Column({
    allowNull: false,
    type: DataTypes.STRING(255),
  })
  public locationDescription: string;

  @ForeignKey(() => Lookup)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public ticketTypeId: number;

  @BelongsTo(() => Lookup, { foreignKey: 'ticketTypeId', as: 'ticketTypeLookup' })
  public ticketTypeLookup: Lookup;

  @ForeignKey(() => Lookup)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public ticketStatusId: number;

  @BelongsTo(() => Lookup, { foreignKey: 'ticketStatusId', as: 'ticketStatusLookup' })
  public ticketStatusLookup: Lookup;

  @Column({
    allowNull: false,
    get: getDate('ticketDate'),
    set: setDate('ticketDate'),
    type: DataTypes.DATEONLY,
  })
  public ticketDate: Date;

  @Column({
    allowNull: false,
    type: DataTypes.TIME,
    comment: 'Start time of the ticket time slot (e.g., 08:00:00)',
  })
  public ticketTimeFrom: string;

  @Column({
    allowNull: false,
    type: DataTypes.TIME,
    comment: 'End time of the ticket time slot (always 2 hours after ticket_time_from, e.g., 10:00:00)',
  })
  public ticketTimeTo: string;

  @ForeignKey(() => User)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public assignToTeamLeaderId: number;

  @BelongsTo(() => User, { foreignKey: 'assignToTeamLeaderId', as: 'assignToTeamLeaderUser' })
  public assignToTeamLeaderUser: User;

  @ForeignKey(() => User)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public assignToTechnicianId: number;

  @BelongsTo(() => User, { foreignKey: 'assignToTechnicianId', as: 'assignToTechnicianUser' })
  public assignToTechnicianUser: User;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(2000),
  })
  public ticketDescription: string;

  @Column({
    allowNull: false,
    defaultValue: false,
    type: DataTypes.BOOLEAN,
  })
  public havingFemaleEngineer: boolean;

  @Column({
    allowNull: true,
    type: DataTypes.STRING(255),
    comment: 'Individual customer name for the ticket',
  })
  public customerName: string | null;

  @Column({
    allowNull: false,
    defaultValue: false,
    type: DataTypes.BOOLEAN,
    comment: 'Whether the ticket requires materials',
  })
  public withMaterial: boolean;

  @ForeignKey(() => Lookup)
  @Column({
    allowNull: false,
    type: DataTypes.INTEGER,
  })
  public mainServiceId: number;

  @BelongsTo(() => Lookup, { foreignKey: 'mainServiceId', as: 'mainServiceLookup' })
  public mainServiceLookup: Lookup;

  @Column({
    allowNull: true,
    comment: 'Service description (optional, max 2000 characters)',
    type: DataTypes.STRING(2000),
  })
  public serviceDescription: string | null;

  @Column({
    allowNull: true,
    type: DataTypes.JSONB,
    comment: 'Array of tool IDs selected for this ticket',
  })
  public tools: number[] | null;

  @CreatedAt
  @Column({
    allowNull: false,
    comment: 'Ticket created DateTime',
    defaultValue: getIsoTimestamp,
    get: getDate('createdAt'),
    set: setDate('createdAt'),
    type: DataTypes.DATE,
  })
  public createdAt: Date;

  @UpdatedAt
  @Column({
    allowNull: false,
    comment: 'Ticket updated DateTime',
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

  @Column({
    allowNull: false,
    defaultValue: 'Web',
    type: DataTypes.STRING(20),
    comment: 'Source of ticket creation: Web (frontend-oms) or Mobile (mobile-mms)',
  })
  public source: string;
}

