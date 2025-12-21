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

  // Create enum type for CompanyStatus
  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_companies_is_active" AS ENUM ('Active', 'Inactive');
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  const lookupsTableExists = await tableExists('lookups');
  const usersTableExists = await tableExists('users');

  // Create companies table
  await queryInterface.createTable('companies', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    company_id: {
      allowNull: false,
      type: DataTypes.STRING(20),
      unique: true,
    },
    title: {
      allowNull: false,
      type: DataTypes.STRING(100),
    },
    company_name_arabic: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    company_name_english: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    country_lookup_id: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    ho_address: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    ho_location: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    ticket_short_code: {
      allowNull: true,
      type: DataTypes.STRING(10),
      unique: true,
    },
    is_active: {
      allowNull: false,
      defaultValue: 'Active',
      type: DataTypes.ENUM({ values: ['Active', 'Inactive'] }),
    },
    logo: {
      allowNull: true,
      type: DataTypes.TEXT,
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
    is_active_audit: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    is_deleted: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
  });

  // Add comments
  await queryInterface.sequelize.query(`
    COMMENT ON COLUMN "companies"."created_at" IS 'Company created DateTime';
    COMMENT ON COLUMN "companies"."updated_at" IS 'Company updated DateTime';
    COMMENT ON COLUMN "companies"."created_by" IS 'User who created this record';
    COMMENT ON COLUMN "companies"."updated_by" IS 'User who last updated this record';
    COMMENT ON COLUMN "companies"."deleted_at" IS 'DateTime when record was deleted';
    COMMENT ON COLUMN "companies"."deleted_by" IS 'User who deleted this record';
    COMMENT ON COLUMN "companies"."is_active_audit" IS 'Whether the record is active (auditing)';
    COMMENT ON COLUMN "companies"."is_deleted" IS 'Whether the record is deleted (soft delete)';
  `);

  // Add foreign key constraints if referenced tables exist
  if (lookupsTableExists) {
    try {
      await queryInterface.addConstraint('companies', {
        fields: ['country_lookup_id'],
        type: 'foreign key',
        name: 'companies_country_lookup_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add country_lookup_id foreign key constraint:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('companies', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'companies_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('companies', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'companies_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('companies', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'companies_deleted_by_fkey',
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
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('companies');
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_companies_is_active";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_companies_is_active:', error.message);
  }
};

