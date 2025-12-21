import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column exists before trying to add it
  const tableDescription = await queryInterface.describeTable('branches');
  
  if (!tableDescription.location) {
    // Add the location column
    await queryInterface.addColumn('branches', 'location', {
      allowNull: true,
      type: DataTypes.STRING(500),
      comment: 'Google Maps URL with latitude and longitude',
    });
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Remove the column if rollback is needed
  const tableDescription = await queryInterface.describeTable('branches');
  
  if (tableDescription.location) {
    await queryInterface.removeColumn('branches', 'location');
  }
};

