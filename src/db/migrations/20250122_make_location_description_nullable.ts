import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column exists and is not nullable
  const tableDescription = await queryInterface.describeTable('tickets');
  
  // Make location_description nullable
  if (tableDescription.location_description && tableDescription.location_description.allowNull === false) {
    await queryInterface.changeColumn('tickets', 'location_description', {
      allowNull: true,
      type: DataTypes.STRING(255),
    });
    console.log('✅ Updated location_description column to allow NULL');
  } else {
    console.log('ℹ️  location_description column already allows NULL or does not exist');
  }
  
  // Make ticket_description nullable and update type to STRING(2000)
  if (tableDescription.ticket_description) {
    const currentAllowNull = tableDescription.ticket_description.allowNull;
    
    // Always update to allow null and change type to STRING(2000) if needed
    await queryInterface.changeColumn('tickets', 'ticket_description', {
      allowNull: true,
      type: DataTypes.STRING(2000),
    });
    console.log('✅ Updated ticket_description column to allow NULL and changed type to STRING(2000)');
  } else {
    console.log('ℹ️  ticket_description column does not exist');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert: make columns NOT NULL again
  // Note: This might fail if there are existing NULL values
  
  await queryInterface.changeColumn('tickets', 'location_description', {
    allowNull: false,
    type: DataTypes.STRING(255),
    defaultValue: '', // Set default empty string for existing NULL values
  });
  
  await queryInterface.changeColumn('tickets', 'ticket_description', {
    allowNull: false,
    type: DataTypes.STRING(255),
    defaultValue: '', // Set default empty string for existing NULL values
  });
  
  console.log('⚠️  Reverted location_description and ticket_description columns to NOT NULL');
};


