import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Helper to check if table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await queryInterface.describeTable(tableName);
      return true;
    } catch {
      return false;
    }
  };

  // Create enum types
  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_files_category" AS ENUM ('image', 'contract');
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_files_entity_type" AS ENUM ('company', 'contract', 'user');
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  const usersTableExists = await tableExists('users');

  // Create files table
  await queryInterface.createTable('files', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    filename: {
      allowNull: false,
      comment: 'Stored filename on disk',
      type: DataTypes.STRING(255),
    },
    original_filename: {
      allowNull: false,
      comment: 'Original filename from upload',
      type: DataTypes.STRING(255),
    },
    path: {
      allowNull: false,
      comment: 'Public path to the file (e.g., /WeFixFiles/Images/filename.jpg)',
      type: DataTypes.STRING(500),
    },
    mime_type: {
      allowNull: false,
      comment: 'File MIME type',
      type: DataTypes.STRING(100),
    },
    size: {
      allowNull: false,
      comment: 'File size in bytes',
      type: DataTypes.BIGINT,
    },
    category: {
      allowNull: false,
      comment: 'File category (image or contract)',
      type: DataTypes.ENUM({ values: ['image', 'contract'] }),
    },
    entity_type: {
      allowNull: false,
      comment: 'Entity type this file belongs to (company, contract, user)',
      type: DataTypes.ENUM({ values: ['company', 'contract', 'user'] }),
    },
    entity_id: {
      allowNull: false,
      comment: 'ID of the entity this file belongs to',
      type: DataTypes.INTEGER,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    created_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    updated_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
  });

  // Add comments
  await queryInterface.sequelize.query(`
    COMMENT ON COLUMN "files"."created_at" IS 'File created DateTime';
    COMMENT ON COLUMN "files"."updated_at" IS 'File updated DateTime';
    COMMENT ON COLUMN "files"."created_by" IS 'User who created this record';
    COMMENT ON COLUMN "files"."updated_by" IS 'User who last updated this record';
  `);

  // Add foreign key constraints if referenced tables exist
  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('files', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'files_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('files', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'files_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add audit field foreign key constraints:', error.message);
    }
  }

  // Add indexes for better query performance
  try {
    await queryInterface.addIndex('files', ['entity_type', 'entity_id'], {
      name: 'files_entity_type_entity_id_idx',
    });
    await queryInterface.addIndex('files', ['category'], {
      name: 'files_category_idx',
    });
  } catch (error: any) {
    console.log('Note: Could not add indexes:', error.message);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('files');
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_files_category";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_files_category:', error.message);
  }
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_files_entity_type";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_files_entity_type:', error.message);
  }
};

