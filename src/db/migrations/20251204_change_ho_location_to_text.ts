import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Helper to check if column exists
  const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    try {
      const tableDescription = await queryInterface.describeTable(tableName);
      return !!tableDescription[columnName];
    } catch {
      return false;
    }
  };

  // Check if ho_location column exists
  if (await columnExists('companies', 'ho_location')) {
    // Alter the column type from VARCHAR(100) to TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "companies" 
      ALTER COLUMN "ho_location" TYPE TEXT;
    `);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert back to VARCHAR(100) - but this might truncate data
  const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    try {
      const tableDescription = await queryInterface.describeTable(tableName);
      return !!tableDescription[columnName];
    } catch {
      return false;
    }
  };

  if (await columnExists('companies', 'ho_location')) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "companies" 
      ALTER COLUMN "ho_location" TYPE VARCHAR(100);
    `);
  }
};

