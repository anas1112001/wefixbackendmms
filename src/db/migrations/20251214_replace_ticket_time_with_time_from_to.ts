import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add new columns first
  await queryInterface.addColumn('tickets', 'ticket_time_from', {
    allowNull: true,
    type: DataTypes.TIME,
    comment: 'Start time of the ticket time slot (e.g., 08:00)',
  });

  await queryInterface.addColumn('tickets', 'ticket_time_to', {
    allowNull: true,
    type: DataTypes.TIME,
    comment: 'End time of the ticket time slot (always 2 hours after ticket_time_from, e.g., 10:00)',
  });

  // Note: This migration will remove the old ticket_time column.
  // If you have existing data in ticket_time that needs to be preserved,
  // you should migrate it manually before running this migration, or update
  // this migration to include data migration logic based on your data format.
  // 
  // Example: If ticket_time is in format "08:00" or "08-10", you could add:
  // UPDATE tickets SET ticket_time_from = ..., ticket_time_to = ... WHERE ticket_time IS NOT NULL;
  
  // Remove old column
  await queryInterface.removeColumn('tickets', 'ticket_time');

  // Make new columns required after migration
  await queryInterface.changeColumn('tickets', 'ticket_time_from', {
    allowNull: false,
    type: DataTypes.TIME,
    comment: 'Start time of the ticket time slot (e.g., 08:00)',
  });

  await queryInterface.changeColumn('tickets', 'ticket_time_to', {
    allowNull: false,
    type: DataTypes.TIME,
    comment: 'End time of the ticket time slot (always 2 hours after ticket_time_from, e.g., 10:00)',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Add back old column
  await queryInterface.addColumn('tickets', 'ticket_time', {
    allowNull: false,
    type: DataTypes.STRING(255),
  });

  // Migrate data back (use ticket_time_from as the value)
  // For rollback, we'll just use ticket_time_from value
  
  // Remove new columns
  await queryInterface.removeColumn('tickets', 'ticket_time_from');
  await queryInterface.removeColumn('tickets', 'ticket_time_to');
}

