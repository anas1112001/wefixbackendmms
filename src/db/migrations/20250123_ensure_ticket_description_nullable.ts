import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Checking ticket_description column...');
  
  // Get current table description
  const tableDescription = await queryInterface.describeTable('tickets');
  
  // Check if ticket_description column exists and is NOT NULL
  if (tableDescription.ticket_description) {
    const isCurrentlyNullable = tableDescription.ticket_description.allowNull;
    
    if (!isCurrentlyNullable) {
      console.log('Making ticket_description column nullable...');
      
      // First, update any NULL values to empty string to avoid constraint violations
      await queryInterface.sequelize.query(`
        UPDATE tickets 
        SET ticket_description = '' 
        WHERE ticket_description IS NULL;
      `);
      
      // Now make the column nullable
      await queryInterface.changeColumn('tickets', 'ticket_description', {
        allowNull: true,
        type: DataTypes.STRING(2000),
      });
      
      console.log('✅ Updated ticket_description column to allow NULL');
    } else {
      console.log('ℹ️  ticket_description column already allows NULL');
    }
  } else {
    console.log('ℹ️  ticket_description column does not exist');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert: make column NOT NULL again
  // Note: This might fail if there are existing NULL values
  
  const tableDescription = await queryInterface.describeTable('tickets');
  
  if (tableDescription.ticket_description) {
    // Update any NULL values to empty string first
    await queryInterface.sequelize.query(`
      UPDATE tickets 
      SET ticket_description = '' 
      WHERE ticket_description IS NULL;
    `);
    
    await queryInterface.changeColumn('tickets', 'ticket_description', {
      allowNull: false,
      type: DataTypes.STRING(2000),
      defaultValue: '',
    });
    
    console.log('⚠️  Reverted ticket_description column to NOT NULL');
  }
};

