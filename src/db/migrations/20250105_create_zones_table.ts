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

  const branchesTableExists = await tableExists('branches');
  const usersTableExists = await tableExists('users');

  // Create zones table
  await queryInterface.createTable('zones', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    zone_title: {
      allowNull: false,
      type: DataTypes.STRING(100),
    },
    zone_number: {
      allowNull: true,
      type: DataTypes.STRING(50),
    },
    zone_description: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    branch_id: {
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
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."created_at" IS 'Zone created DateTime';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."updated_at" IS 'Zone updated DateTime';`);
    if (usersTableExists) {
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."created_by" IS 'User who created this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."updated_by" IS 'User who last updated this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."deleted_by" IS 'User who deleted this record';`);
    }
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."deleted_at" IS 'DateTime when record was deleted';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "zones"."is_deleted" IS 'Whether the record is deleted (soft delete)';`);
  } catch (error: any) {
    console.log('Note: Could not add some column comments:', error.message);
  }

  // Add foreign key constraints if referenced tables exist
  if (branchesTableExists) {
    try {
      await queryInterface.addConstraint('zones', {
        fields: ['branch_id'],
        type: 'foreign key',
        name: 'zones_branch_id_fkey',
        references: {
          table: 'branches',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add branch_id foreign key constraint:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('zones', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'zones_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('zones', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'zones_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('zones', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'zones_deleted_by_fkey',
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
  await queryInterface.dropTable('zones');
};

