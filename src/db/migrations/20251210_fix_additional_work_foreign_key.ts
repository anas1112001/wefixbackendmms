import { DataTypes, QueryInterface, QueryTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await queryInterface.describeTable(tableName);
      return true;
    } catch {
      return false;
    }
  };

  if (!(await tableExists('additional_work'))) {
    console.log('   ⚠️  additional_work table does not exist, skipping foreign key fix');
    return;
  }

  // Check the actual data types of both columns
      const [ticketIdType] = await queryInterface.sequelize.query(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_name = 'tickets' AND column_name = 'id'`,
        { type: QueryTypes.SELECT }
      ) as any[];

      const [additionalWorkTicketIdType] = await queryInterface.sequelize.query(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_name = 'additional_work' AND column_name = 'ticket_id'`,
        { type: QueryTypes.SELECT }
      ) as any[];

  console.log('   Tickets.id type:', ticketIdType?.data_type);
  console.log('   Additional_work.ticket_id type:', additionalWorkTicketIdType?.data_type);

  // Drop the foreign key constraint if it exists and has a type mismatch
  try {
    // Get all foreign key constraints on additional_work.ticket_id
    const [constraints] = await queryInterface.sequelize.query(
      `SELECT conname 
       FROM pg_constraint 
       WHERE conrelid = 'additional_work'::regclass 
       AND confrelid = 'tickets'::regclass 
       AND conkey::text LIKE '%ticket_id%'`,
      { type: QueryTypes.SELECT }
    ) as any[];

    if (constraints && constraints.length > 0) {
      for (const constraint of constraints) {
        try {
          await queryInterface.removeConstraint('additional_work', constraint.conname);
          console.log(`   ✅ Dropped foreign key constraint: ${constraint.conname}`);
        } catch (error: any) {
          console.log(`   ⚠️  Could not drop constraint ${constraint.conname}: ${error.message}`);
        }
      }
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not check/drop foreign key constraints: ${error.message}`);
  }

  // Ensure ticket_id column is INTEGER
  if (additionalWorkTicketIdType?.data_type !== 'integer') {
    console.log(`   ⚠️  additional_work.ticket_id is ${additionalWorkTicketIdType?.data_type}, converting to INTEGER...`);
    try {
      await queryInterface.changeColumn('additional_work', 'ticket_id', {
        allowNull: false,
        type: DataTypes.INTEGER,
      });
      console.log('   ✅ Converted additional_work.ticket_id to INTEGER');
    } catch (error: any) {
      console.log(`   ⚠️  Could not convert ticket_id to INTEGER: ${error.message}`);
    }
  }

  // Re-add the foreign key constraint with correct types
  if (ticketIdType?.data_type === 'integer' || ticketIdType?.data_type === 'bigint') {
    try {
      await queryInterface.addConstraint('additional_work', {
        fields: ['ticket_id'],
        name: 'additional_work_ticket_id_fkey',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        references: {
          table: 'tickets',
          field: 'id',
        },
        type: 'foreign key',
      });
      console.log('   ✅ Re-added foreign key constraint with correct types');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.log(`   ⚠️  Could not add foreign key constraint: ${error.message}`);
      } else {
        console.log('   ⚠️  Foreign key constraint already exists');
      }
    }
  } else {
    console.log(`   ⚠️  Cannot add foreign key: tickets.id is ${ticketIdType?.data_type}, expected INTEGER`);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // This migration is idempotent, so down is a no-op
  console.log('   ⚠️  Down migration is a no-op for this fix');
};

