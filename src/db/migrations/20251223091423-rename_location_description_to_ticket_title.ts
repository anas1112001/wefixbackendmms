import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('tickets');
  
  // Check if location_description column exists
  if (tableDescription.location_description) {
    // First, update any NULL values to empty string (since we're making it required)
    await queryInterface.sequelize.query(`
      UPDATE tickets 
      SET location_description = '' 
      WHERE location_description IS NULL;
    `);
    
    // Rename the column from location_description to ticket_title
    await queryInterface.renameColumn('tickets', 'location_description', 'ticket_title');
    
    // Make it required (not null)
    await queryInterface.changeColumn('tickets', 'ticket_title', {
      allowNull: false,
      type: DataTypes.STRING(255),
      defaultValue: '',
    });
    
    console.log('✅ Renamed location_description to ticket_title and made it required');
  } else if (tableDescription.ticket_title) {
    // Column already renamed, just make sure it's required
    await queryInterface.changeColumn('tickets', 'ticket_title', {
      allowNull: false,
      type: DataTypes.STRING(255),
      defaultValue: '',
    });
    console.log('✅ Updated ticket_title column to be required');
  } else {
    console.log('ℹ️  Neither location_description nor ticket_title column found');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('tickets');
  
  // Revert: rename ticket_title back to location_description and make it nullable
  if (tableDescription.ticket_title) {
    await queryInterface.renameColumn('tickets', 'ticket_title', 'location_description');
    
    await queryInterface.changeColumn('tickets', 'location_description', {
      allowNull: true,
      type: DataTypes.STRING(255),
    });
    
    console.log('⚠️  Reverted ticket_title back to location_description and made it nullable');
  } else {
    console.log('ℹ️  ticket_title column not found, nothing to revert');
  }
};
