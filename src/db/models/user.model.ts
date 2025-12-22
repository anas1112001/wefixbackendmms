import { DataTypes } from 'sequelize'
import { BelongsTo, Column, CreatedAt, ForeignKey, Model, Table, UpdatedAt } from 'sequelize-typescript'

import { Company } from './company.model'
import { Lookup } from './lookup.model'

import { getDate, getIsoTimestamp, setDate, toLowerCase } from '../../lib'

@Table({
  modelName: 'User',
  tableName: 'users',
  underscored: true,
})

export class User extends Model {

  @Column({
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
    type: DataTypes.INTEGER,
  })
  public id: number
  
  @Column({
    allowNull: false,
    set: toLowerCase('userNumber'),
    type: DataTypes.STRING(10),
    unique: true,
  })
  
  public userNumber: string

  @Column({
    allowNull: false,
    comment: 'User full name in Arabic',
    type: DataTypes.STRING(256),
  })
  public fullName: string

  @Column({
    allowNull: false,
    comment: 'User full name in English',
    type: DataTypes.STRING(256),
  })
  public fullNameEnglish: string


  @Column({
    allowNull: true,
    set: toLowerCase('email'),
    type: DataTypes.STRING(128),
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  public email: string | null


  @Column({
    allowNull: false,
    set: toLowerCase('deviceId'),
    type: DataTypes.STRING(128),
    unique: false,
  })
  public deviceId: string

  @Column({
    allowNull: false,
    type: DataTypes.STRING(),
    unique: false,
  })
  public fcmToken: string

  @Column({
    allowNull: false,
    type: DataTypes.STRING, 
  })
  public password: string;
  
  @Column({
    allowNull: true,
    comment: 'Mobile phone number for password recovery',
    type: DataTypes.STRING(15),
  })
  public mobileNumber: string | null

  @Column({
    allowNull: true,
    comment: 'Country code for mobile number',
    defaultValue: '+962',
    type: DataTypes.STRING(10),
  })
  public countryCode: string | null

  @Column({
    allowNull: true,
    comment: 'Username for login (max 10 characters)',
    set: toLowerCase('username'),
    type: DataTypes.STRING(10),
    unique: true,
  })
  public username: string | null

  @ForeignKey(() => Lookup)
  @Column({
    allowNull: false,
    comment: 'User Role lookup reference',
    type: DataTypes.INTEGER,
  })
  public userRoleId: number

  @BelongsTo(() => Lookup, { foreignKey: 'userRoleId', as: 'userRoleLookup' })
  public userRoleLookup: Lookup

  @ForeignKey(() => Company)
  @Column({
    allowNull: true,
    type: DataTypes.INTEGER,
  })
  public companyId: number | null

  @BelongsTo(() => Company, { foreignKey: 'companyId', as: 'company' })
  public company?: Company | null


  @CreatedAt
  @Column({
    allowNull: false,
    comment: 'User created DateTime',
    defaultValue: getIsoTimestamp,
    get: getDate('createdAt'),
    set: setDate('createdAt'),
    type: DataTypes.DATE,
  })
  public createdAt: Date

  @UpdatedAt
  @Column({
    allowNull: false,
    comment: 'User updated DateTime',
    defaultValue: getIsoTimestamp,
    get: getDate('updatedAt'),
    set: setDate('updatedAt'),
    type: DataTypes.DATE,
  })
  public updatedAt: Date

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who created this record',
    type: DataTypes.INTEGER,
  })
  public createdBy: number | null

  @BelongsTo(() => User, { foreignKey: 'createdBy', as: 'creator' })
  public creator?: User | null

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who last updated this record',
    type: DataTypes.INTEGER,
  })
  public updatedBy: number | null

  @BelongsTo(() => User, { foreignKey: 'updatedBy', as: 'updater' })
  public updater?: User | null

  @Column({
    allowNull: true,
    comment: 'DateTime when record was deleted',
    get: getDate('deletedAt'),
    set: setDate('deletedAt'),
    type: DataTypes.DATE,
  })
  public deletedAt: Date | null

  @ForeignKey(() => User)
  @Column({
    allowNull: true,
    comment: 'User who deleted this record',
    type: DataTypes.INTEGER,
  })
  public deletedBy: number | null

  @BelongsTo(() => User, { foreignKey: 'deletedBy', as: 'deleter' })
  public deleter?: User | null

  @Column({
    allowNull: false,
    comment: 'Whether the record is active',
    defaultValue: true,
    type: DataTypes.BOOLEAN,
  })
  public isActive: boolean

  @Column({
    allowNull: false,
    comment: 'Whether the record is deleted (soft delete)',
    defaultValue: false,
    type: DataTypes.BOOLEAN,
  })
  public isDeleted: boolean

  @Column({
    allowNull: true,
    comment: 'User authentication token',
    type: DataTypes.STRING(255),
    unique: true,
  })
  public token: string | null

  @Column({
    allowNull: true,
    comment: 'Token expiration timestamp (10 hours from generation)',
    get: getDate('tokenExpiresAt'),
    set: setDate('tokenExpiresAt'),
    type: DataTypes.DATE,
  })
  public tokenExpiresAt: Date | null

  @Column({
    allowNull: false,
    comment: 'Number of consecutive failed login attempts',
    defaultValue: 0,
    type: DataTypes.INTEGER,
  })
  public failedLoginAttempts: number

  @Column({
    allowNull: true,
    comment: 'Timestamp when account will be unlocked (null if not locked)',
    get: getDate('accountLockedUntil'),
    set: setDate('accountLockedUntil'),
    type: DataTypes.DATE,
  })
  public accountLockedUntil: Date | null

  @Column({
    allowNull: true,
    comment: 'Password reset token for forgotten password flow',
    type: DataTypes.STRING(255),
    unique: true,
  })
  public passwordResetToken: string | null

  @Column({
    allowNull: true,
    comment: 'Password reset token expiration timestamp',
    get: getDate('passwordResetTokenExpiresAt'),
    set: setDate('passwordResetTokenExpiresAt'),
    type: DataTypes.DATE,
  })
  public passwordResetTokenExpiresAt: Date | null

  @Column({
    allowNull: true,
    comment: 'User gender (Male/Female) - used for filtering technicians when "Having a Female Engineer" is required',
    type: DataTypes.STRING(10),
  })
  public gender: string | null

  @Column({
    allowNull: true,
    comment: 'User profile image URL or file path',
    type: DataTypes.STRING(512),
  })
  public profileImage: string | null
}
