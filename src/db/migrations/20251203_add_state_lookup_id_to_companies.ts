import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add state_lookup_id column to companies table
  await queryInterface.addColumn('companies', 'state_lookup_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'State lookup reference',
  });

  // Add foreign key constraint
  try {
    await queryInterface.addConstraint('companies', {
      fields: ['state_lookup_id'],
      type: 'foreign key',
      name: 'companies_state_lookup_id_fkey',
      references: {
        table: 'lookups',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  } catch (error: any) {
    console.log('Note: Could not add state_lookup_id foreign key constraint:', error.message);
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Remove foreign key constraint first
  try {
    await queryInterface.removeConstraint('companies', 'companies_state_lookup_id_fkey');
  } catch (error: any) {
    console.log('Note: Could not remove state_lookup_id foreign key constraint:', error.message);
  }

  // Remove the column
  await queryInterface.removeColumn('companies', 'state_lookup_id');
}

