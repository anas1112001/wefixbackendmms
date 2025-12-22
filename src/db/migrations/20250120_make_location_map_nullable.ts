import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Make location_map nullable in tickets table
 * 
 * This migration allows locationMap to be null since it's now optional
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Alter the location_map column to allow NULL
  await queryInterface.changeColumn('tickets', 'location_map', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Revert: Make location_map NOT NULL again
  // Note: This might fail if there are existing NULL values
  await queryInterface.changeColumn('tickets', 'location_map', {
    type: DataTypes.STRING(255),
    allowNull: false,
  });
}

