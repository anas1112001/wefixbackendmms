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

  const companiesTableExists = await tableExists('companies');
  const lookupsTableExists = await tableExists('lookups');
  const usersTableExists = await tableExists('users');

  // Create branches table
  await queryInterface.createTable('branches', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    branch_title: {
      allowNull: false,
      type: DataTypes.STRING(100),
    },
    branch_name_arabic: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    branch_name_english: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    branch_representative_name: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    representative_mobile_number: {
      allowNull: true,
      type: DataTypes.STRING(20),
    },
    representative_email_address: {
      allowNull: true,
      type: DataTypes.STRING(100),
    },
    company_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    team_leader_lookup_id: {
      allowNull: true,
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
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."created_at" IS 'Branch created DateTime';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."updated_at" IS 'Branch updated DateTime';`);
    if (usersTableExists) {
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."created_by" IS 'User who created this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."updated_by" IS 'User who last updated this record';`);
      await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."deleted_by" IS 'User who deleted this record';`);
    }
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."deleted_at" IS 'DateTime when record was deleted';`);
    await queryInterface.sequelize.query(`COMMENT ON COLUMN "branches"."is_deleted" IS 'Whether the record is deleted (soft delete)';`);
  } catch (error: any) {
    console.log('Note: Could not add some column comments:', error.message);
  }

  // Add foreign key constraints if referenced tables exist
  if (companiesTableExists) {
    try {
      await queryInterface.addConstraint('branches', {
        fields: ['company_id'],
        type: 'foreign key',
        name: 'branches_company_id_fkey',
        references: {
          table: 'companies',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add company_id foreign key constraint:', error.message);
    }
  }

  if (lookupsTableExists) {
    try {
      await queryInterface.addConstraint('branches', {
        fields: ['team_leader_lookup_id'],
        type: 'foreign key',
        name: 'branches_team_leader_lookup_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add team_leader_lookup_id foreign key constraint:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('branches', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'branches_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('branches', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'branches_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('branches', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'branches_deleted_by_fkey',
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
  await queryInterface.dropTable('branches');
};

