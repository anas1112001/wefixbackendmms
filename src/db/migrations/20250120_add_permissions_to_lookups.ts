import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Add permissions column to lookups table
  await queryInterface.addColumn('lookups', 'permissions', {
    allowNull: true,
    comment: 'JSON array of entity permissions (e.g., ["Companies", "Contracts", "Tickets"])',
    type: DataTypes.TEXT,
  });
};

export const down = async (queryInterface: QueryInterface) => {
  // Remove permissions column from lookups table
  await queryInterface.removeColumn('lookups', 'permissions');
};

