import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Removing process_id, start_time, and end_time fields from tickets table...');
  
  // Step 1: Remove foreign key constraint for process_id
  try {
    await queryInterface.removeConstraint('tickets', 'tickets_process_id_fkey');
    console.log('✓ Removed foreign key constraint tickets_process_id_fkey');
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Note: Foreign key constraint tickets_process_id_fkey does not exist');
    } else {
      console.log('Note: Could not remove foreign key constraint:', error.message);
    }
  }
  
  // Step 2: Remove process_id column
  try {
    await queryInterface.removeColumn('tickets', 'process_id');
    console.log('✓ Removed process_id column');
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Note: process_id column does not exist');
    } else {
      console.log('Note: Could not remove process_id column:', error.message);
    }
  }
  
  // Step 3: Remove start_time column
  try {
    await queryInterface.removeColumn('tickets', 'start_time');
    console.log('✓ Removed start_time column');
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Note: start_time column does not exist');
    } else {
      console.log('Note: Could not remove start_time column:', error.message);
    }
  }
  
  // Step 4: Remove end_time column
  try {
    await queryInterface.removeColumn('tickets', 'end_time');
    console.log('✓ Removed end_time column');
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('Note: end_time column does not exist');
    } else {
      console.log('Note: Could not remove end_time column:', error.message);
    }
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('Restoring process_id, start_time, and end_time fields to tickets table...');
  
  // This would restore the columns as they were in the original migration
  // For safety, we'll just log a warning since restoring requires the exact original structure
  console.log('Warning: Down migration would restore columns from 20251211_add_ticket_fields_customer_process_time_material.ts');
  console.log('To restore, run the up migration from that file or manually add the columns.');
};

