import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Helper to check if table exists
  const tableExists = async (tableName: string) => {
    const [results] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
      );`
    );

    return (results[0] as { exists: boolean }).exists;
  };

  const ticketsTableExists = await tableExists('tickets');
  const usersTableExists = await tableExists('users');

  if (!ticketsTableExists) {
    console.log('Tickets table does not exist, skipping migration');

    return;
  }

  // Drop existing foreign key constraints that reference lookups
  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE tickets 
      DROP CONSTRAINT IF EXISTS tickets_assign_to_team_leader_id_fkey;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE tickets 
      DROP CONSTRAINT IF EXISTS tickets_assign_to_technician_id_fkey;
    `);
  } catch (error: any) {
    console.log('Note: Could not drop existing foreign key constraints:', error.message);
  }

  // Add new foreign key constraints that reference users table
  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('tickets', {
        fields: ['assign_to_team_leader_id'],
        type: 'foreign key',
        name: 'tickets_assign_to_team_leader_id_fkey',
        references: {
          table: 'users',
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
          table: 'users',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add user foreign key constraints:', error.message);
    }
  }

  // Update column comments
  try {
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "tickets"."assign_to_team_leader_id" IS 'Team Leader User reference (from users table)';
    `);
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "tickets"."assign_to_technician_id" IS 'Technician User reference (from users table)';
    `);
  } catch (error: any) {
    console.log('Note: Could not update column comments:', error.message);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Drop user foreign key constraints
  try {
    await queryInterface.sequelize.query(`
      ALTER TABLE tickets 
      DROP CONSTRAINT IF EXISTS tickets_assign_to_team_leader_id_fkey;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE tickets 
      DROP CONSTRAINT IF EXISTS tickets_assign_to_technician_id_fkey;
    `);
  } catch (error: any) {
    console.log('Note: Could not drop user foreign key constraints:', error.message);
  }

  // Re-add lookup foreign key constraints (if lookups table exists)
  const lookupsTableExists = async () => {
    const [results] = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lookups'
      );`
    );

    return (results[0] as { exists: boolean }).exists;
  };

  if (await lookupsTableExists()) {
    try {
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
    } catch (error: any) {
      console.log('Note: Could not re-add lookup foreign key constraints:', error.message);
    }
  }
};



