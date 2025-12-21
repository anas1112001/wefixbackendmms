import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column exists before trying to remove it
  const tableDescription = await queryInterface.describeTable('companies');
  
  if (tableDescription.is_active_audit) {
    // Remove the column
    await queryInterface.removeColumn('companies', 'is_active_audit');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Re-add the column if rollback is needed
  const tableDescription = await queryInterface.describeTable('companies');
  
  if (!tableDescription.is_active_audit) {
    await queryInterface.addColumn('companies', 'is_active_audit', {
      allowNull: false,
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    });
    
    // Add comment
    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "companies"."is_active_audit" IS 'Whether the record is active (auditing)';
    `);
  }
};

