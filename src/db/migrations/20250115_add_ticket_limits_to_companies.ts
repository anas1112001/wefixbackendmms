import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Helper to check if column exists
  const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    try {
      const tableDescription = await queryInterface.describeTable(tableName);
      return columnName in tableDescription;
    } catch {
      return false;
    }
  };

  const tableName = 'companies';

  // Add total_corrective column
  if (!(await columnExists(tableName, 'total_corrective'))) {
    await queryInterface.addColumn(tableName, 'total_corrective', {
      allowNull: true,
      comment: 'Total limit for corrective tickets',
      defaultValue: 0,
      type: DataTypes.INTEGER,
    });
  }

  // Add total_preventive column
  if (!(await columnExists(tableName, 'total_preventive'))) {
    await queryInterface.addColumn(tableName, 'total_preventive', {
      allowNull: true,
      comment: 'Total limit for preventive tickets',
      defaultValue: 0,
      type: DataTypes.INTEGER,
    });
  }

  // Add total_emergency column
  if (!(await columnExists(tableName, 'total_emergency'))) {
    await queryInterface.addColumn(tableName, 'total_emergency', {
      allowNull: true,
      comment: 'Total limit for emergency tickets',
      defaultValue: 0,
      type: DataTypes.INTEGER,
    });
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableName = 'companies';

  // Remove columns in reverse order
  await queryInterface.removeColumn(tableName, 'total_emergency');
  await queryInterface.removeColumn(tableName, 'total_preventive');
  await queryInterface.removeColumn(tableName, 'total_corrective');
};






















