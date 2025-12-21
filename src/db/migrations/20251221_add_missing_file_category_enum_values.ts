import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Adding missing enum values to enum_files_category...');
  
  // Add missing enum values: 'document', 'video', 'audio', 'other'
  // PostgreSQL requires adding enum values one at a time using ALTER TYPE ... ADD VALUE
  // Note: PostgreSQL doesn't support IF NOT EXISTS for ADD VALUE, so we catch the error if it already exists
  try {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_files_category" ADD VALUE 'document';
    `);
    console.log('✓ Added "document" to enum_files_category');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Note: "document" already exists in enum_files_category');
    } else {
      console.log('Note: Could not add "document" to enum:', error.message);
    }
  }

  try {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_files_category" ADD VALUE 'video';
    `);
    console.log('✓ Added "video" to enum_files_category');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Note: "video" already exists in enum_files_category');
    } else {
      console.log('Note: Could not add "video" to enum:', error.message);
    }
  }

  try {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_files_category" ADD VALUE 'audio';
    `);
    console.log('✓ Added "audio" to enum_files_category');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Note: "audio" already exists in enum_files_category');
    } else {
      console.log('Note: Could not add "audio" to enum:', error.message);
    }
  }

  try {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_files_category" ADD VALUE 'other';
    `);
    console.log('✓ Added "other" to enum_files_category');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Note: "other" already exists in enum_files_category');
    } else {
      console.log('Note: Could not add "other" to enum:', error.message);
    }
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('Warning: PostgreSQL does not support removing enum values.');
  console.log('To remove enum values, you would need to:');
  console.log('1. Create a new enum type with the desired values');
  console.log('2. Update the column to use the new enum type');
  console.log('3. Drop the old enum type');
  console.log('This is a complex operation and may cause data loss.');
  console.log('Skipping down migration for safety.');
};

