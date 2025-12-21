import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await queryInterface.describeTable(tableName);
      return true;
    } catch {
      return false;
    }
  };

  const ticketsTableExists = await tableExists('tickets');
  const usersTableExists = await tableExists('users');
  const filesTableExists = await tableExists('files');

  if (!ticketsTableExists) {
    console.log('   ⚠️  Tickets table does not exist, skipping additional_work table creation');
    return;
  }

  if (await tableExists('additional_work')) {
    console.log('   ⚠️  additional_work table already exists, skipping creation');
    return;
  }

  await queryInterface.createTable('additional_work', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    ticket_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'tickets',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    title: {
      allowNull: false,
      type: DataTypes.STRING(255),
    },
    description: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    status: {
      allowNull: false,
      defaultValue: 'IN_PROGRESS',
      type: DataTypes.ENUM('IN_PROGRESS', 'APPROVED', 'CANCELED', 'REJECTED'),
    },
    proposal_file_id: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    submitted_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    created_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
      references: usersTableExists ? {
        model: 'users',
        key: 'id',
      } : undefined,
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    updated_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
      references: usersTableExists ? {
        model: 'users',
        key: 'id',
      } : undefined,
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    deleted_at: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    deleted_by: {
      allowNull: true,
      type: DataTypes.INTEGER,
      references: usersTableExists ? {
        model: 'users',
        key: 'id',
      } : undefined,
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    is_deleted: {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    },
  });

  await queryInterface.sequelize.query(`
    COMMENT ON TABLE "additional_work" IS 'Additional work items associated with tickets';
    COMMENT ON COLUMN "additional_work"."ticket_id" IS 'Foreign key to tickets table';
    COMMENT ON COLUMN "additional_work"."title" IS 'Title of the additional work';
    COMMENT ON COLUMN "additional_work"."description" IS 'Description of the additional work';
    COMMENT ON COLUMN "additional_work"."status" IS 'Status of the additional work (IN_PROGRESS, APPROVED, CANCELED, REJECTED)';
    COMMENT ON COLUMN "additional_work"."proposal_file_id" IS 'Foreign key to files table for proposal document';
    COMMENT ON COLUMN "additional_work"."submitted_at" IS 'Date and time when the work was submitted';
  `);

  // Add foreign key constraint for proposal_file_id if files table exists
  if (filesTableExists) {
    try {
      await queryInterface.addConstraint('additional_work', {
        fields: ['proposal_file_id'],
        name: 'additional_work_proposal_file_id_fkey',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
        references: {
          table: 'files',
          field: 'id',
        },
        type: 'foreign key',
      });
      console.log('   ✅ Added foreign key constraint for proposal_file_id');
    } catch (error: any) {
      // Silently skip if constraint already exists or cannot be implemented
      const errorMsg = error.message || String(error);
      if (!errorMsg.includes('already exists') && !errorMsg.includes('cannot be implemented')) {
        console.log(`   ⚠️  Could not add foreign key constraint for proposal_file_id: ${errorMsg}`);
      } else {
        console.log(`   ⚠️  Skipping foreign key constraint for proposal_file_id (${errorMsg.includes('already exists') ? 'already exists' : 'cannot be implemented'})`);
      }
    }
  } else {
    console.log('   ⚠️  Files table does not exist, skipping foreign key constraint for proposal_file_id');
  }

  console.log('   ✅ Created additional_work table');
};

export const down = async (queryInterface: QueryInterface) => {
  const tableExists = async (tableName: string): Promise<boolean> => {
    try {
      await queryInterface.describeTable(tableName);
      return true;
    } catch {
      return false;
    }
  };

  if (await tableExists('additional_work')) {
    await queryInterface.dropTable('additional_work');
    console.log('   ✅ Dropped additional_work table');
  } else {
    console.log('   ⚠️  additional_work table does not exist, skipping drop');
  }
};

