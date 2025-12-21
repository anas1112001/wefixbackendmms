import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Check if column already exists
  const tableDescription = await queryInterface.describeTable('users');
  
  if (!tableDescription.gender) {
    await queryInterface.addColumn('users', 'gender', {
      allowNull: true,
      type: DataTypes.STRING(10),
    });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN "users"."gender" IS 'User gender (Male/Female) - used for filtering technicians when "Having a Female Engineer" is required';
    `);

    console.log('   ✅ Added gender column to users table');
  } else {
    console.log('   ⚠️  Column gender already exists in users table, skipping');
  }
};

export const down = async (queryInterface: QueryInterface) => {
  const tableDescription = await queryInterface.describeTable('users');
  
  if (tableDescription.gender) {
    await queryInterface.removeColumn('users', 'gender');
    console.log('   ✅ Removed gender column from users table');
  }
};



