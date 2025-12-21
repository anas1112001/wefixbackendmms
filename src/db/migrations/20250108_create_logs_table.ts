import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  // Helper to check if table exists
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await queryInterface.describeTable(tableName);
      return true;
    } catch {
      return false;
    }
  };

  // Create enum type for Actions
  try {
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_logs_action_type" AS ENUM ('in', 'out', 'break', 'leave', 'smoke break');
    `);
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }

  const usersTableExists = await tableExists('users');

  // Create logs table
  await queryInterface.createTable('logs', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    action_type: {
      allowNull: false,
      comment: 'Action type for logs: in, out, break, leave',
      type: DataTypes.ENUM({ values: ['in', 'out', 'break', 'leave', 'smoke break'] }),
    },
    time: {
      allowNull: false,
      comment: 'Time of logged action',
      type: DataTypes.DATE,
    },
    description: {
      allowNull: true,
      comment: 'Description for logging action',
      type: DataTypes.STRING(100),
    },
    user_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    created_at: {
      allowNull: false,
      comment: 'Log created DateTime',
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      comment: 'Log updated DateTime',
      type: DataTypes.DATE,
    },
    is_archived: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
    created_by: {
      allowNull: true,
      comment: 'User who created this record',
      type: DataTypes.INTEGER,
    },
    updated_by: {
      allowNull: true,
      comment: 'User who last updated this record',
      type: DataTypes.INTEGER,
    },
    deleted_at: {
      allowNull: true,
      comment: 'DateTime when record was deleted',
      type: DataTypes.DATE,
    },
    deleted_by: {
      allowNull: true,
      comment: 'User who deleted this record',
      type: DataTypes.INTEGER,
    },
    is_active: {
      allowNull: false,
      comment: 'Whether the record is active',
      defaultValue: true,
      type: DataTypes.BOOLEAN,
    },
    is_deleted: {
      allowNull: false,
      comment: 'Whether the record is deleted (soft delete)',
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
  });

  // Add foreign key constraints if referenced tables exist
  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('logs', {
        fields: ['user_id'],
        type: 'foreign key',
        name: 'logs_user_id_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'NO ACTION',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('logs', {
        fields: ['created_by'],
        type: 'foreign key',
        name: 'logs_created_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('logs', {
        fields: ['updated_by'],
        type: 'foreign key',
        name: 'logs_updated_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('logs', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'logs_deleted_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      console.log('Note: Could not add foreign key constraints:', error.message);
    }
  }
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.dropTable('logs');
  try {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_logs_action_type";');
  } catch (error: any) {
    console.log('Note: Could not drop enum_logs_action_type:', error.message);
  }
};

