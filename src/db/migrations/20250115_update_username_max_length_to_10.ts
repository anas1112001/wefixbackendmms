import { QueryInterface, DataTypes } from 'sequelize';

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

  // Check if username column exists
  if (await columnExists('users', 'username')) {
    // Alter the column to allow up to 10 characters
    await queryInterface.changeColumn('users', 'username', {
      allowNull: true,
      type: DataTypes.STRING(10),
      unique: true,
    });
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert back to STRING(5)
  const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    try {
      const tableDescription = await queryInterface.describeTable(tableName);
      return !!tableDescription[columnName];
    } catch {
      return false;
    }
  };

  if (await columnExists('users', 'username')) {
    // First, truncate any usernames longer than 5 characters
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET username = LEFT(username, 5)
      WHERE username IS NOT NULL AND LENGTH(username) > 5;
    `);

    // Then change the column back to STRING(5)
    await queryInterface.changeColumn('users', 'username', {
      allowNull: true,
      type: DataTypes.STRING(5),
      unique: true,
    });
  }
};

