import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('users');
  
  if (!tableDescription.profile_image) {
    await queryInterface.addColumn('users', 'profile_image', {
      allowNull: true,
      type: DataTypes.STRING(512),
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "users"."profile_image" IS 'User profile image URL or file path';
    `);

    console.log('   ✅ Added profile_image column to users table');
  } else {
    console.log('   ⚠️  Column profile_image already exists in users table, skipping');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('users');
  
  if (tableDescription.profile_image) {
    await queryInterface.removeColumn('users', 'profile_image');
    console.log('   ✅ Removed profile_image column from users table');
  }
};

