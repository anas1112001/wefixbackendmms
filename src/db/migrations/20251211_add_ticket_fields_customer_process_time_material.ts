import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add customerName field
  await queryInterface.addColumn('tickets', 'customer_name', {
    allowNull: true,
    type: DataTypes.STRING(255),
    comment: 'Individual customer name for the ticket',
  });

  // Add processId field (foreign key to lookups)
  await queryInterface.addColumn('tickets', 'process_id', {
    allowNull: true,
    type: DataTypes.INTEGER,
    comment: 'Process lookup ID (e.g., Ready to Visit)',
  });

  // Add startTime field
  await queryInterface.addColumn('tickets', 'start_time', {
    allowNull: true,
    type: DataTypes.TIME,
    comment: 'Start time for the ticket',
  });

  // Add endTime field
  await queryInterface.addColumn('tickets', 'end_time', {
    allowNull: true,
    type: DataTypes.TIME,
    comment: 'End time for the ticket',
  });

  // Add withMaterial field
  await queryInterface.addColumn('tickets', 'with_material', {
    allowNull: false,
    defaultValue: false,
    type: DataTypes.BOOLEAN,
    comment: 'Whether the ticket requires materials',
  });

  // Add foreign key constraint for processId
  await queryInterface.addConstraint('tickets', {
    fields: ['process_id'],
    name: 'tickets_process_id_fkey',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    references: {
      field: 'id',
      table: 'lookups',
    },
    type: 'foreign key',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove foreign key constraint
  await queryInterface.removeConstraint('tickets', 'tickets_process_id_fkey');

  // Remove columns
  await queryInterface.removeColumn('tickets', 'customer_name');
  await queryInterface.removeColumn('tickets', 'process_id');
  await queryInterface.removeColumn('tickets', 'start_time');
  await queryInterface.removeColumn('tickets', 'end_time');
  await queryInterface.removeColumn('tickets', 'with_material');
}

