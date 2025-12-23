import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column exists and is not nullable
  const tableDescription = await queryInterface.describeTable('tickets');
  
  if (tableDescription.location_description && tableDescription.location_description.allowNull === false) {
    // Alter column to allow null
    await queryInterface.changeColumn('tickets', 'location_description', {
      allowNull: true,
      type: DataTypes.STRING(255),
    });
    
    console.log('✅ Updated location_description column to allow NULL');
  } else {
    console.log('ℹ️  location_description column already allows NULL or does not exist');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert: make location_description NOT NULL again
  // Note: This might fail if there are existing NULL values
  await queryInterface.changeColumn('tickets', 'location_description', {
    allowNull: false,
    type: DataTypes.STRING(255),
    defaultValue: '', // Set default empty string for existing NULL values
  });
  
  console.log('⚠️  Reverted location_description column to NOT NULL');
};

