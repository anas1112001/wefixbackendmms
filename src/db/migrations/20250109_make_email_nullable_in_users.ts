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

  // Check if email column exists
  if (await columnExists('users', 'email')) {
    // Alter the column to allow NULL values
    await queryInterface.changeColumn('users', 'email', {
      allowNull: true,
      type: DataTypes.STRING(128),
      unique: true,
      validate: {
        isEmail: true,
      },
    });
  }
};

export const down = async (queryInterface: QueryInterface) => {
  // Revert back to NOT NULL - but this might fail if there are NULL values
  const columnExists = async (tableName: string, columnName: string): Promise<boolean> => {
    try {
      const tableDescription = await queryInterface.describeTable(tableName);
      return !!tableDescription[columnName];
    } catch {
      return false;
    }
  };

  if (await columnExists('users', 'email')) {
    // First, set a default email for any NULL values
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET email = CONCAT('user_', id, '@wefix.com')
      WHERE email IS NULL;
    `);

    // Then make it NOT NULL
    await queryInterface.changeColumn('users', 'email', {
      allowNull: false,
      type: DataTypes.STRING(128),
      unique: true,
      validate: {
        isEmail: true,
      },
    });
  }
};

