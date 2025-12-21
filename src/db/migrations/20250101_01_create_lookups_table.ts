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

  // Create enum type for LookupCategory
  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_lookups_category" AS ENUM (
        'BusinessModel',
        'CompanyRole',
        'Country',
        'EstablishedType',
        'MainService',
        'ManagedBy',
        'State',
        'SubService',
        'Tool',
        'UserRole',
        'TicketCode',
        'TicketType',
        'TicketStatus',
        'TicketTime',
        'ResponseTime',
        'TeamLeader',
        'Technician'
      );
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  // Create lookups table
  await queryInterface.createTable('lookups', {
    id: {
      allowNull: false,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    category: {
      allowNull: false,
      type: DataTypes.ENUM({
        values: [
          'BusinessModel',
          'CompanyRole',
          'Country',
          'EstablishedType',
          'MainService',
          'ManagedBy',
          'State',
          'SubService',
          'Tool',
          'UserRole',
          'TicketCode',
          'TicketType',
          'TicketStatus',
          'TicketTime',
          'ResponseTime',
        ],
      }),
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING(100),
    },
    name_arabic: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    code: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    description: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    order_id: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
    },
    is_default: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    is_active: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    parent_lookup_id: {
      allowNull: true,
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
    deleted_at: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    deleted_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    is_deleted: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
  });

  // Add comments (one at a time to avoid issues)
  try {
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."created_at" IS 'Lookup created DateTime';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."updated_at" IS 'Lookup updated DateTime';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."created_by" IS 'User who created this record';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."updated_by" IS 'User who last updated this record';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."deleted_at" IS 'DateTime when record was deleted';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."deleted_by" IS 'User who deleted this record';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "lookups"."is_deleted" IS 'Whether the record is deleted (soft delete)';`);
  } catch (error: any) {
    console.log('Note: Could not add some column comments:', error.message);
  }

  // Add self-referencing foreign key for parent_lookup_id
  try {
    await queryInterface.addConstraint('lookups', {
      fields: ['parent_lookup_id'],
      type: 'foreign key',
      name: 'lookups_parent_lookup_id_fkey',
      references: {
        table: 'lookups',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  } catch (error: any) {
    console.log('Note: Could not add parent_lookup_id foreign key constraint:', error.message);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('lookups');
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_lookups_category";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_lookups_category:', error.message);
  }
};

