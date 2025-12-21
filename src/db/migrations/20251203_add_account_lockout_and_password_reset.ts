import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add failed login attempts counter
  await queryInterface.addColumn('users', 'failed_login_attempts', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of consecutive failed login attempts',
  });

  // Add account locked until timestamp
  await queryInterface.addColumn('users', 'account_locked_until', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when account will be unlocked (null if not locked)',
  });

  // Add password reset token
  await queryInterface.addColumn('users', 'password_reset_token', {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: 'Password reset token for forgotten password flow',
  });

  // Add password reset token expiration
  await queryInterface.addColumn('users', 'password_reset_token_expires_at', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Password reset token expiration timestamp',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'failed_login_attempts');
  await queryInterface.removeColumn('users', 'account_locked_until');
  await queryInterface.removeColumn('users', 'password_reset_token');
  await queryInterface.removeColumn('users', 'password_reset_token_expires_at');
}

