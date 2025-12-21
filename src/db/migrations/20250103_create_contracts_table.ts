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

  // Create contracts table
  await queryInterface.createTable('contracts', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    contract_reference: {
      allowNull: false,
      type: DataTypes.STRING(50),
      unique: true,
    },
    contract_title: {
      allowNull: false,
      type: DataTypes.STRING(200),
    },
    company_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    business_model_lookup_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    is_active: {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    number_of_team_leaders: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
    },
    number_of_branches: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
    },
    number_of_preventive_tickets: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
    },
    number_of_corrective_tickets: {
      allowNull: false,
      defaultValue: 0,
      type: DataTypes.INTEGER,
    },
    contract_start_date: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    contract_end_date: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    contract_value: {
      allowNull: true,
      type: DataTypes.DECIMAL(15, 2),
    },
    contract_files: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    contract_description: {
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
    is_deleted: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
  });

  // Add comments
  await queryInterface.sequelize.query(`
    COMMENT ON COLUMN "contracts"."created_at" IS 'Contract created DateTime';
    COMMENT ON COLUMN "contracts"."updated_at" IS 'Contract updated DateTime';
    COMMENT ON COLUMN "contracts"."created_by" IS 'User who created this record';
    COMMENT ON COLUMN "contracts"."updated_by" IS 'User who last updated this record';
    COMMENT ON COLUMN "contracts"."deleted_at" IS 'DateTime when record was deleted';
    COMMENT ON COLUMN "contracts"."deleted_by" IS 'User who deleted this record';
    COMMENT ON COLUMN "contracts"."is_deleted" IS 'Whether the record is deleted (soft delete)';
  `);

  // Add foreign key constraints if referenced tables exist
  if (companiesTableExists) {
    try {
      await queryInterface.addConstraint('contracts', {
        fields: ['company_id'],
        type: 'foreign key',
        name: 'contracts_company_id_fkey',
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
      await queryInterface.addConstraint('contracts', {
        fields: ['business_model_lookup_id'],
        type: 'foreign key',
        name: 'contracts_business_model_lookup_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add business_model_lookup_id foreign key constraint:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('contracts', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'contracts_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('contracts', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'contracts_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('contracts', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'contracts_deleted_by_fkey',
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
  await queryInterface.dropTable('contracts');
};
