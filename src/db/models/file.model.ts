import { DataTypes } from 'sequelize';
import { BelongsTo, Column, ForeignKey, Model, Table } from 'sequelize-typescript';

import { User } from './user.model';

import { getDate, getIsoTimestamp, setDate } from '../../lib';

// Legacy enums for backward compatibility
export enum FileCategory {
  IMAGE = 'image',
  CONTRACT = 'contract',
}

export enum FileEntityType {
  COMPANY = 'company',
  CONTRACT = 'contract',
  USER = 'user',
}

// ReferenceType enum values as per specification
export enum FileReferenceType {
  TICKET_ATTACHMENT = 'TICKET_ATTACHMENT',
  COMPANY = 'COMPANY',
  USER = 'USER',
  LOGO = 'LOGO',
  CONTRACT = 'CONTRACT',
  INVOICE = 'INVOICE',
  ASSET = 'ASSET',
  PROJECT = 'PROJECT',
  GENERAL = 'GENERAL',
}

// FileType enum values
export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  EXCEL = 'excel',
  XLSX = 'xlsx',
  VIDEO = 'video',
  OTHER = 'other',
}

// StorageProvider enum values
export enum StorageProvider {
  LOCAL = 'LOCAL',
  AWS_S3 = 'AWS_S3',
  AZURE_BLOB = 'AZURE_BLOB',
  GOOGLE_CLOUD = 'GOOGLE_CLOUD',
}

// Helper functions to convert between old and new formats
export const convertFileCategoryToFileType = (category: FileCategory): string => {
  switch (category) {
    case FileCategory.IMAGE:
      return FileType.IMAGE;
    case FileCategory.CONTRACT:
      return FileType.PDF;
    default:
      return FileType.OTHER;
  }
};

export const convertFileEntityTypeToReferenceType = (entityType: FileEntityType): string => {
  switch (entityType) {
    case FileEntityType.COMPANY:
      return FileReferenceType.COMPANY;
    case FileEntityType.CONTRACT:
      return FileReferenceType.CONTRACT;
    case FileEntityType.USER:
      return FileReferenceType.USER;
    default:
      return FileReferenceType.GENERAL;
  }
};

@Table({
  modelName: 'File',
  tableName: 'files',
  underscored: true,
})
export class File extends Model {
  @Column({
    allowNull: false,
    primaryKey: true,
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
  })
  public id: string;

  // Only legacy columns remain after migration

  // Legacy fields for backward compatibility (deprecated - use new fields instead)
  // These will be removed in a future migration after all code is updated
  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use referenceId instead',
    type: DataTypes.INTEGER,
  })
  public entityId?: number | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use referenceType instead',
    type: DataTypes.ENUM({ values: Object.values(FileEntityType) }),
  })
  public entityType?: FileEntityType | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use fileName instead',
    type: DataTypes.STRING(255),
  })
  public filename?: string | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Original filename from upload',
    type: DataTypes.STRING(255),
  })
  public originalFilename?: string | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use filePath instead',
    type: DataTypes.STRING(500),
  })
  public path?: string | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: File MIME type',
    type: DataTypes.STRING(100),
  })
  public mimeType?: string | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: File size in bytes (use fileSizeMB instead)',
    type: DataTypes.BIGINT,
  })
  public size?: number | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use fileType instead',
    type: DataTypes.ENUM({ values: Object.values(FileCategory) }),
  })
  public category?: FileCategory | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use uploadedBy and uploadedAt instead',
    type: DataTypes.INTEGER,
  })
  public createdBy?: number | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use uploadedBy and uploadedAt instead',
    type: DataTypes.INTEGER,
  })
  public updatedBy?: number | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED: Use uploadedAt instead',
    get: getDate('createdAt'),
    set: setDate('createdAt'),
    type: DataTypes.DATE,
  })
  public createdAt?: Date | null;

  @Column({
    allowNull: true,
    comment: 'DEPRECATED',
    get: getDate('updatedAt'),
    set: setDate('updatedAt'),
    type: DataTypes.DATE,
  })
  public updatedAt?: Date | null;
}
