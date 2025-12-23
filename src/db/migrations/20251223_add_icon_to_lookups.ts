import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('lookups');

  // Add icon column if it doesn't exist
  if (!tableDescription.icon) {
    await queryInterface.addColumn('lookups', 'icon', {
      allowNull: true,
      type: DataTypes.STRING(500),
      comment: 'Icon/image path for the service (e.g., /WeFixFiles/Icons/electrical.png)',
    });
    console.log('✅ Added icon column to lookups table');
  } else {
    console.log('ℹ️  icon column already exists in lookups table');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('lookups');

  // Remove icon column if it exists
  if (tableDescription.icon) {
    await queryInterface.removeColumn('lookups', 'icon');
    console.log('⚠️  Removed icon column from lookups table');
  } else {
    console.log('ℹ️  icon column does not exist in lookups table');
  }
};

