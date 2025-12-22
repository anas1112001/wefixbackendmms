import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Remove Preventive ticket type from lookups table
 * 
 * This migration:
 * 1. Sets isActive = false for Preventive ticket type (id: 202)
 * 2. Optionally deletes tickets with Preventive type (if needed)
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  // Deactivate Preventive ticket type
  await queryInterface.sequelize.query(`
    UPDATE lookups 
    SET is_active = false, 
        updated_at = NOW()
    WHERE id = 202 
      AND category = 'TicketType'
      AND code = 'PREV';
  `);

  // Optional: Delete or update tickets with Preventive type
  // Uncomment if you want to delete Preventive tickets:
  // await queryInterface.sequelize.query(`
  //   UPDATE tickets 
  //   SET is_deleted = true, 
  //       updated_at = NOW()
  //   WHERE ticket_type_id = 202 
  //     AND is_deleted = false;
  // `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Reactivate Preventive ticket type
  await queryInterface.sequelize.query(`
    UPDATE lookups 
    SET is_active = true, 
        updated_at = NOW()
    WHERE id = 202 
      AND category = 'TicketType'
      AND code = 'PREV';
  `);
}

