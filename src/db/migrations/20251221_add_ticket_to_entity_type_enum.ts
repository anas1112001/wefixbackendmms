import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Adding "ticket" value to entity_type enum...');
  const enumName = '"entity_type"';
  const valueToAdd = 'ticket';

  try {
    await queryInterface.sequelize.query(`ALTER TYPE ${enumName} ADD VALUE '${valueToAdd}';`);
    console.log(`✓ Added "${valueToAdd}" to ${enumName}`);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log(`Note: "${valueToAdd}" already exists in ${enumName}`);
    } else {
      console.log(`Note: Could not add "${valueToAdd}" to enum:`, error.message);
      throw error;
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

