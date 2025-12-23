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
  const contractsTableExists = await tableExists('contracts');
  const branchesTableExists = await tableExists('branches');
  const zonesTableExists = await tableExists('zones');
  const usersTableExists = await tableExists('users');

  // Create tickets table
  await queryInterface.createTable('tickets', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    ticket_code_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    company_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    contract_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    branch_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    zone_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    location_map: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    location_description: {
      allowNull: true,
      type: DataTypes.STRING(255),
    },
    ticket_type_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    ticket_status_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    ticket_date: {
      allowNull: false,
      type: DataTypes.DATEONLY,
    },
    ticket_time: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    assign_to_team_leader_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    assign_to_technician_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    ticket_description: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    having_female_engineer: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    main_service_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    service_description: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    tools: {
      allowNull: true,
      type: DataTypes.JSONB,
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
    COMMENT ON COLUMN "tickets"."tools" IS 'Array of tool IDs selected for this ticket';
    COMMENT ON COLUMN "tickets"."created_at" IS 'Ticket created DateTime';
    COMMENT ON COLUMN "tickets"."updated_at" IS 'Ticket updated DateTime';
    COMMENT ON COLUMN "tickets"."created_by" IS 'User who created this record';
    COMMENT ON COLUMN "tickets"."updated_by" IS 'User who last updated this record';
    COMMENT ON COLUMN "tickets"."deleted_at" IS 'DateTime when record was deleted';
    COMMENT ON COLUMN "tickets"."deleted_by" IS 'User who deleted this record';
    COMMENT ON COLUMN "tickets"."is_deleted" IS 'Whether the record is deleted (soft delete)';
  `);

  // Add foreign key constraints if referenced tables exist
  if (lookupsTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['ticket_code_id'],
        type: 'foreign key',
        name: 'tickets_ticket_code_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['ticket_type_id'],
        type: 'foreign key',
        name: 'tickets_ticket_type_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['ticket_status_id'],
        type: 'foreign key',
        name: 'tickets_ticket_status_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['assign_to_team_leader_id'],
        type: 'foreign key',
        name: 'tickets_assign_to_team_leader_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['assign_to_technician_id'],
        type: 'foreign key',
        name: 'tickets_assign_to_technician_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['main_service_id'],
        type: 'foreign key',
        name: 'tickets_main_service_id_fkey',
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

  if (companiesTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['company_id'],
        type: 'foreign key',
        name: 'tickets_company_id_fkey',
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

  if (contractsTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['contract_id'],
        type: 'foreign key',
        name: 'tickets_contract_id_fkey',
        references: {
          table: 'contracts',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add contract_id foreign key constraint:', error.message);
    }
  }

  if (branchesTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['branch_id'],
        type: 'foreign key',
        name: 'tickets_branch_id_fkey',
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

  if (zonesTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['zone_id'],
        type: 'foreign key',
        name: 'tickets_zone_id_fkey',
        references: {
          table: 'zones',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add zone_id foreign key constraint:', error.message);
    }
  }

  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'tickets_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'tickets_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('tickets', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'tickets_deleted_by_fkey',
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
  await queryInterface.dropTable('tickets');
};

