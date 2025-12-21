import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('contracts');
  
  if (!tableDescription.having_female_engineer) {
    await queryInterface.addColumn('contracts', 'having_female_engineer', {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "contracts"."having_female_engineer" IS 'Whether the contract requires a female engineer';
    `);

    console.log('   ✅ Added having_female_engineer column to contracts table');
  } else {
    console.log('   ⚠️  Column having_female_engineer already exists in contracts table, skipping');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('contracts');
  
  if (tableDescription.having_female_engineer) {
    await queryInterface.removeColumn('contracts', 'having_female_engineer');
    console.log('   ✅ Removed having_female_engineer column from contracts table');
  }
};



