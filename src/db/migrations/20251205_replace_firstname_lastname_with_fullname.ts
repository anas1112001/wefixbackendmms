import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Add new columns
  await queryInterface.addColumn('users', 'full_name', {
    allowNull: true,
    type: DataTypes.STRING(256),
    comment: 'User full name in Arabic',
  });

  await queryInterface.addColumn('users', 'full_name_english', {
    allowNull: true,
    type: DataTypes.STRING(256),
    comment: 'User full name in English',
  });

  // Migrate existing data: combine first_name and last_name into full_name_english
  // For now, we'll use English as the default since we don't have Arabic data
  await queryInterface.sequelize.query(`
    UPDATE users 
    SET full_name_english = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))
    WHERE first_name IS NOT NULL OR last_name IS NOT NULL;
  `);

  // Copy to full_name as well (can be updated later with Arabic names)
  await queryInterface.sequelize.query(`
    UPDATE users 
    SET full_name = full_name_english
    WHERE full_name_english IS NOT NULL;
  `);

  // Make columns NOT NULL after data migration
  await queryInterface.changeColumn('users', 'full_name', {
    allowNull: false,
    type: DataTypes.STRING(256),
    comment: 'User full name in Arabic',
  });

  await queryInterface.changeColumn('users', 'full_name_english', {
    allowNull: false,
    type: DataTypes.STRING(256),
    comment: 'User full name in English',
  });

  // Drop old columns
  await queryInterface.removeColumn('users', 'first_name');
  await queryInterface.removeColumn('users', 'last_name');
};

export const down = async (queryInterface: QueryInterface) => {
  // Add back old columns
  await queryInterface.addColumn('users', 'first_name', {
    allowNull: true,
    type: DataTypes.STRING(128),
  });

  await queryInterface.addColumn('users', 'last_name', {
    allowNull: true,
    type: DataTypes.STRING(128),
  });

  // Try to split full_name_english back (simple split on first space)
  await queryInterface.sequelize.query(`
    UPDATE users 
    SET 
      first_name = SPLIT_PART(full_name_english, ' ', 1),
      last_name = SUBSTRING(full_name_english FROM LENGTH(SPLIT_PART(full_name_english, ' ', 1)) + 2)
    WHERE full_name_english IS NOT NULL AND full_name_english != '';
  `);

  // Make columns NOT NULL
  await queryInterface.changeColumn('users', 'first_name', {
    allowNull: false,
    type: DataTypes.STRING(128),
  });

  await queryInterface.changeColumn('users', 'last_name', {
    allowNull: false,
    type: DataTypes.STRING(128),
  });

  // Drop new columns
  await queryInterface.removeColumn('users', 'full_name');
  await queryInterface.removeColumn('users', 'full_name_english');
};

