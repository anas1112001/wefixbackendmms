import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('contracts');
  
  if (!tableDescription.managed_by_lookup_id) {
    await queryInterface.addColumn('contracts', 'managed_by_lookup_id', {
      allowNull: true,
      type: DataTypes.INTEGER,
    });

    // Add foreign key constraint to lookups table
    try {
      await queryInterface.addConstraint('contracts', {
        fields: ['managed_by_lookup_id'],
        type: 'foreign key',
        name: 'contracts_managed_by_lookup_id_fkey',
        references: {
          table: 'lookups',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      console.log('   ✅ Added foreign key constraint for managed_by_lookup_id');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.log('   ⚠️  Could not add foreign key constraint:', error.message);
      }
    }

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "contracts"."managed_by_lookup_id" IS 'Reference to the Managed By lookup (WeFix Team or Client Team)';
    `);

    console.log('   ✅ Added managed_by_lookup_id column to contracts table');
  } else {
    console.log('   ⚠️  Column managed_by_lookup_id already exists in contracts table, skipping');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('contracts');
  
  if (tableDescription.managed_by_lookup_id) {
    // Remove foreign key constraint first
    try {
      await queryInterface.removeConstraint('contracts', 'contracts_managed_by_lookup_id_fkey');
      console.log('   ✅ Removed foreign key constraint for managed_by_lookup_id');
    } catch (error: any) {
      if (!error.message.includes('does not exist')) {
        console.log('   ⚠️  Could not remove foreign key constraint:', error.message);
      }
    }

    await queryInterface.removeColumn('contracts', 'managed_by_lookup_id');
    console.log('   ✅ Removed managed_by_lookup_id column from contracts table');
  }
};




