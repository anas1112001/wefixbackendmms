import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column exists and get its current definition
  const tableDescription = await queryInterface.describeTable('tickets');
  
  if (tableDescription.service_description) {
    // Alter the column to allow null and increase max length to 2000
    await queryInterface.changeColumn('tickets', 'service_description', {
      allowNull: true,
      type: DataTypes.STRING(2000),
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "tickets"."service_description" IS 'Service description (optional, max 2000 characters)';
    `);

    console.log('   ✅ Updated service_description column to be optional with max length 2000');
  } else {
    console.log('   ⚠️  Column service_description does not exist in tickets table, skipping');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('tickets');
  
  if (tableDescription.service_description) {
    // Revert to not nullable and max length 255
    await queryInterface.changeColumn('tickets', 'service_description', {
      allowNull: false,
      type: DataTypes.STRING(255),
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "tickets"."service_description" IS NULL;
    `);

    console.log('   ✅ Reverted service_description column to required with max length 255');
  }
};



