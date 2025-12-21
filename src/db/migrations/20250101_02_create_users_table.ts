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

  const lookupsTableExists = await tableExists('lookups');
  const companiesTableExists = await tableExists('companies');

  // Create users table without foreign key constraints first
  await queryInterface.createTable('users', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    user_number: {
      allowNull: false,
      type: DataTypes.STRING(10),
      unique: true,
    },
    first_name: {
      allowNull: false,
      type: DataTypes.STRING(128),
    },
    last_name: {
      allowNull: false,
      type: DataTypes.STRING(128),
    },
    email: {
      allowNull: false,
      type: DataTypes.STRING(128),
      unique: true,
    },
    device_id: {
      allowNull: false,
      type: DataTypes.STRING(128),
    },
    fcm_token: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    password: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    mobile_number: {
      allowNull: true,
      type: DataTypes.STRING(15),
    },
    country_code: {
      allowNull: true,
      defaultValue: '+962',
      type: DataTypes.STRING(10),
    },
    username: {
      allowNull: true,
      type: DataTypes.STRING(5),
      unique: true,
    },
    user_role_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    company_id: {
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
    is_active: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    is_deleted: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    token: {
      allowNull: true,
      type: DataTypes.STRING(255),
      unique: true,
    },
    token_expires_at: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  });

  // Add comments
  await queryInterface.sequelize.query(`
    COMMENT ON COLUMN "users"."mobile_number" IS 'Mobile phone number for password recovery';
    COMMENT ON COLUMN "users"."country_code" IS 'Country code for mobile number';
    COMMENT ON COLUMN "users"."username" IS 'Username for login (5 characters)';
    COMMENT ON COLUMN "users"."user_role_id" IS 'User Role lookup reference';
    COMMENT ON COLUMN "users"."created_at" IS 'User created DateTime';
    COMMENT ON COLUMN "users"."updated_at" IS 'User updated DateTime';
    COMMENT ON COLUMN "users"."created_by" IS 'User who created this record';
    COMMENT ON COLUMN "users"."updated_by" IS 'User who last updated this record';
    COMMENT ON COLUMN "users"."deleted_at" IS 'DateTime when record was deleted';
    COMMENT ON COLUMN "users"."deleted_by" IS 'User who deleted this record';
    COMMENT ON COLUMN "users"."is_active" IS 'Whether the record is active';
    COMMENT ON COLUMN "users"."is_deleted" IS 'Whether the record is deleted (soft delete)';
    COMMENT ON COLUMN "users"."token" IS 'User authentication token';
    COMMENT ON COLUMN "users"."token_expires_at" IS 'Token expiration timestamp (10 hours from generation)';
  `);

  // Add foreign key constraints if referenced tables exist
  if (lookupsTableExists) {
    try {
      await queryInterface.addConstraint('users', {
        fields: ['user_role_id'],
        type: 'foreign key',
        name: 'users_user_role_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add user_role_id foreign key constraint:', error.message);
    }
  }

  if (companiesTableExists) {
    try {
      await queryInterface.addConstraint('users', {
        fields: ['company_id'],
        type: 'foreign key',
        name: 'users_company_id_fkey',
        references: {
          table: 'companies',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add company_id foreign key constraint:', error.message);
    }
  }

  // Add self-referencing foreign keys for audit fields
  try {
    await queryInterface.addConstraint('users', {
      fields: ['created_by'],
      type: 'foreign key',
      name: 'users_created_by_fkey',
      references: {
        table: 'users',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('users', {
      fields: ['updated_by'],
      type: 'foreign key',
      name: 'users_updated_by_fkey',
      references: {
        table: 'users',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('users', {
      fields: ['deleted_by'],
      type: 'foreign key',
      name: 'users_deleted_by_fkey',
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
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('users');
};

