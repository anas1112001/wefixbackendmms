import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Drop the foreign key constraint first
  try {
    await queryInterface.removeConstraint('tickets', 'tickets_ticket_code_id_fkey');
    console.log('   Dropped foreign key constraint: tickets_ticket_code_id_fkey');
  } catch (error: any) {
    // Constraint might not exist, continue
    if (!error.message.includes('does not exist')) {
      console.log(`   ⚠️  Could not drop foreign key constraint: ${error.message}`);
    }
  }

  // Change column type from INTEGER to VARCHAR
  await queryInterface.changeColumn('tickets', 'ticket_code_id', {
    allowNull: false,
    type: DataTypes.STRING(50), // nvarchar equivalent - supports alphanumeric with company shortcode
  });

  // Add comment
  await queryInterface.sequelize.query(`
    COMMENT ON COLUMN "tickets"."ticket_code_id" IS 'Alphanumeric ticket code with company shortcode (e.g., COMP001-TKT-001)';
  `);

  console.log('   ✅ Changed ticket_code_id from INTEGER to VARCHAR(50)');
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert to INTEGER (note: this will fail if there are non-numeric values)
  await queryInterface.changeColumn('tickets', 'ticket_code_id', {
    allowNull: false,
    type: DataTypes.INTEGER,
  });

  // Re-add foreign key constraint (if needed)
  // Note: This will only work if all values are valid lookup IDs
  try {
    await queryInterface.addConstraint('tickets', {
      fields: ['ticket_code_id'],
      type: 'foreign key',
      name: 'tickets_ticket_code_id_fkey',
      references: {
        table: 'lookups',
        field: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  } catch (error: any) {
    console.log(`   ⚠️  Could not re-add foreign key constraint: ${error.message}`);
  }
};




