import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('🔄 Dropping ticket_category_id column from tickets table...');

  try {
    // Check if the column exists before dropping
    const tableDescription = await queryInterface.describeTable('tickets');

    if (tableDescription.ticket_category_id) {
      // Drop the foreign key constraint first
      try {
        await queryInterface.removeConstraint('tickets', 'tickets_ticket_category_id_fkey');
        console.log('   ✅ Dropped foreign key constraint tickets_ticket_category_id_fkey');
      } catch (error: any) {
        console.log('   ⚠️  Foreign key constraint may not exist:', error.message);
      }

      // Drop the column
      await queryInterface.removeColumn('tickets', 'ticket_category_id');
      console.log('   ✅ Dropped ticket_category_id column from tickets table');
    } else {
      console.log('   ⚠️  Column ticket_category_id does not exist, skipping');
    }
  } catch (error: any) {
    console.error('   ❌ Error dropping ticket_category_id column:', error.message);
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('🔄 Re-adding ticket_category_id column to tickets table...');

  try {
    // Check if the column already exists
    const tableDescription = await queryInterface.describeTable('tickets');

    if (!tableDescription.ticket_category_id) {
      // Add the column back
      await queryInterface.addColumn('tickets', 'ticket_category_id', {
        allowNull: true, // Make it nullable for rollback
        type: DataTypes.INTEGER,
      });
      console.log('   ✅ Added ticket_category_id column back to tickets table');

      // Add the foreign key constraint back
      try {
        await queryInterface.addConstraint('tickets', {
          fields: ['ticket_category_id'],
          name: 'tickets_ticket_category_id_fkey',
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
          references: {
            field: 'id',
            table: 'lookups',
          },
          type: 'foreign key',
        });
        console.log('   ✅ Added foreign key constraint tickets_ticket_category_id_fkey');
      } catch (error: any) {
        console.log('   ⚠️  Could not add foreign key constraint:', error.message);
      }
    } else {
      console.log('   ⚠️  Column ticket_category_id already exists, skipping');
    }
  } catch (error: any) {
    console.error('   ❌ Error re-adding ticket_category_id column:', error.message);
    throw error;
  }
};


