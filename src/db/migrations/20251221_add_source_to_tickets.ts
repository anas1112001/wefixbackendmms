import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Adding source field to tickets table...');
  
  // Add source column
  try {
    await queryInterface.addColumn('tickets', 'source', {
      allowNull: false,
      type: DataTypes.STRING(20),
      defaultValue: 'Web',
      comment: 'Source of ticket creation: Web (frontend-oms) or Mobile (mobile-mms)',
    });
    console.log('✓ Added source column to tickets table');
    
    // Update existing tickets to have 'Web' as default
    await queryInterface.sequelize.query(`
      UPDATE tickets SET source = 'Web' WHERE source IS NULL;
    `);
    console.log('✓ Updated existing tickets to have source = "Web"');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Note: source column already exists in tickets table');
    } else {
      console.log('Note: Could not add source column:', error.message);
      throw error;
    }
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('Removing source field from tickets table...');
  
  try {
    await queryInterface.removeColumn('tickets', 'source');
    console.log('✓ Removed source column from tickets table');
  } catch (error: any) {
    console.log('Note: Could not remove source column:', error.message);
  }
};

