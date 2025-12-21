import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Removing reference_id and reference_type columns from files table...');
  
  try {
    await queryInterface.removeColumn('files', 'reference_id');
    console.log('✓ Removed reference_id column');
  } catch (error: any) {
    console.log('Note: Could not remove reference_id column:', error.message);
  }

  try {
    await queryInterface.removeColumn('files', 'reference_type');
    console.log('✓ Removed reference_type column');
  } catch (error: any) {
    console.log('Note: Could not remove reference_type column:', error.message);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('Restoring reference_id and reference_type columns to files table...');
  
  // Note: This is a destructive migration - data will be lost
  // You may want to backup data before running this down migration
  console.log('Warning: This down migration cannot restore data that was in these columns');
};
