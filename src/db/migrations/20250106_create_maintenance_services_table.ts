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

  // Create enum type for itemType
  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_maintenance_services_item_type" AS ENUM ('company', 'ticket');
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  const companiesTableExists = await tableExists('companies');
  const lookupsTableExists = await tableExists('lookups');
  const usersTableExists = await tableExists('users');

  // Create maintenance_services table
  await queryInterface.createTable('maintenance_services', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    item_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    item_type: {
      allowNull: false,
      defaultValue: 'company',
      type: DataTypes.ENUM({ values: ['company', 'ticket'] }),
    },
    main_service_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    sub_service_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    is_active: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
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
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."created_at" IS 'MaintenanceService created DateTime';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."updated_at" IS 'MaintenanceService updated DateTime';`);
    if (usersTableExists) {
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."created_by" IS 'User who created this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."updated_by" IS 'User who last updated this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."deleted_by" IS 'User who deleted this record';`);
    }
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."deleted_at" IS 'DateTime when record was deleted';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "maintenance_services"."is_deleted" IS 'Whether the record is deleted (soft delete)';`);
  } catch (error: any) {
    console.log('Note: Could not add some column comments:', error.message);
  }

  // Add foreign key constraints if referenced tables exist
  if (lookupsTableExists) {
    try {
      await queryInterface.addConstraint('maintenance_services', {
        fields: ['main_service_id'],
        type: 'foreign key',
        name: 'maintenance_services_main_service_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('maintenance_services', {
        fields: ['sub_service_id'],
        type: 'foreign key',
        name: 'maintenance_services_sub_service_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add lookup foreign key constraints:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('maintenance_services', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'maintenance_services_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('maintenance_services', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'maintenance_services_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('maintenance_services', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'maintenance_services_deleted_by_fkey',
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
  await queryInterface.dropTable('maintenance_services');
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_maintenance_services_item_type";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_maintenance_services_item_type:', error.message);
  }
};

