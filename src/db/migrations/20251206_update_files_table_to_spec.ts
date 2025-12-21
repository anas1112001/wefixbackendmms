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

  const filesTableExists = await tableExists('files');

  if (!filesTableExists) {
    console.log('Files table does not exist. Creating new table with specification structure...');
    
    // Enable UUID extension if not already enabled
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    } catch (error: any) {
      console.log('Note: Could not enable uuid-ossp extension:', error.message);
    }

    // Create files table with new structure
    await queryInterface.createTable('files', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      reference_id: {
        allowNull: false,
        comment: 'ID of the entity this file belongs to (TicketId, CompanyId, UserId, etc.)',
        type: DataTypes.INTEGER, // Using INTEGER to match existing entity IDs (can be changed to UUID later if needed)
      },
      reference_type: {
        allowNull: false,
        comment: 'Type of entity this file belongs to (TICKET_ATTACHMENT, COMPANY, USER, LOGO, CONTRACT, etc.)',
        type: DataTypes.STRING(100),
      },
      file_name: {
        allowNull: false,
        comment: 'Stored filename on disk',
        type: DataTypes.STRING(255),
      },
      file_extension: {
        allowNull: false,
        comment: 'File extension (jpg, png, pdf, docx, etc.)',
        type: DataTypes.STRING(20),
      },
      file_size_mb: {
        allowNull: false,
        comment: 'File size in megabytes',
        type: DataTypes.DECIMAL(10, 2),
      },
      file_type: {
        allowNull: false,
        comment: 'File type category (image, pdf, doc, excel, video, etc.)',
        type: DataTypes.STRING(50),
      },
      file_path: {
        allowNull: false,
        comment: 'Actual path OR URL in S3/Blob storage',
        type: DataTypes.STRING(500),
      },
      storage_provider: {
        allowNull: false,
        defaultValue: 'LOCAL',
        comment: 'Storage provider (LOCAL, AWS_S3, AZURE_BLOB, GOOGLE_CLOUD)',
        type: DataTypes.STRING(100),
      },
      description: {
        allowNull: true,
        comment: 'Optional file description',
        type: DataTypes.STRING(2000),
      },
      uploaded_by: {
        allowNull: false,
        comment: 'User who uploaded this file',
        type: DataTypes.INTEGER, // Using INTEGER to match User.id type
      },
      uploaded_at: {
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'File upload timestamp',
        type: DataTypes.DATE,
      },
      is_deleted: {
        allowNull: false,
        defaultValue: false,
        comment: 'Soft delete flag',
        type: DataTypes.BOOLEAN,
      },
      deleted_at: {
        allowNull: true,
        comment: 'Soft delete timestamp',
        type: DataTypes.DATE,
      },
      deleted_by: {
        allowNull: true,
        comment: 'User who deleted this file',
        type: DataTypes.INTEGER, // Using INTEGER to match User.id type
      },
    });

    // Add unique constraint on (reference_id, file_name)
    await queryInterface.addConstraint('files', {
      fields: ['reference_id', 'file_name'],
      type: 'unique',
      name: 'idx_files_reference',
    });

    // Add foreign key constraints if referenced tables exist
    const usersTableExists = await tableExists('users');
    if (usersTableExists) {
      try {
        await queryInterface.addConstraint('files', {
          fields: ['uploaded_by'],
          type: 'foreign key',
          name: 'files_uploaded_by_fkey',
          references: {
            table: 'users',
            field: 'id',
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        });
        await queryInterface.addConstraint('files', {
          fields: ['deleted_by'],
          type: 'foreign key',
          name: 'files_deleted_by_fkey',
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

    // Add indexes for better query performance
    try {
      await queryInterface.addIndex('files', ['reference_type', 'reference_id'], {
        name: 'files_reference_type_reference_id_idx',
      });
      await queryInterface.addIndex('files', ['file_type'], {
        name: 'files_file_type_idx',
      });
      await queryInterface.addIndex('files', ['storage_provider'], {
        name: 'files_storage_provider_idx',
      });
      await queryInterface.addIndex('files', ['is_deleted'], {
        name: 'files_is_deleted_idx',
      });
    } catch (error: any) {
      console.log('Note: Could not add indexes:', error.message);
    }

    return;
  }

  // If table exists, we need to migrate the structure
  console.log('Files table exists. Migrating to new structure...');

  // Enable UUID extension if not already enabled
  try {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  } catch (error: any) {
    console.log('Note: Could not enable uuid-ossp extension:', error.message);
  }

  // Step 1: Add new columns
  try {
    await queryInterface.addColumn('files', 'reference_id', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add reference_id column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'reference_type', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.STRING(100),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add reference_type column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'file_extension', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.STRING(20),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add file_extension column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'file_size_mb', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.DECIMAL(10, 2),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add file_size_mb column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'file_type', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.STRING(50),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add file_type column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'file_path', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.STRING(500),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add file_path column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'storage_provider', {
      allowNull: true, // Temporarily nullable for migration
      defaultValue: 'LOCAL',
      type: DataTypes.STRING(100),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add storage_provider column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'description', {
      allowNull: true,
      type: DataTypes.STRING(2000),
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add description column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'uploaded_by', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add uploaded_by column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'uploaded_at', {
      allowNull: true, // Temporarily nullable for migration
      type: DataTypes.DATE,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add uploaded_at column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'is_deleted', {
      allowNull: true, // Temporarily nullable for migration
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add is_deleted column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'deleted_at', {
      allowNull: true,
      type: DataTypes.DATE,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add deleted_at column:', error.message);
    }
  }

  try {
    await queryInterface.addColumn('files', 'deleted_by', {
      allowNull: true,
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add deleted_by column:', error.message);
    }
  }

  // Step 2: Migrate data from old columns to new columns
  await queryInterface.sequelize.query(`
    UPDATE files
    SET 
      reference_id = entity_id,
      reference_type = CASE 
        WHEN entity_type::text = 'company' THEN 'COMPANY'
        WHEN entity_type::text = 'contract' THEN 'CONTRACT'
        WHEN entity_type::text = 'user' THEN 'USER'
        ELSE UPPER(entity_type::text)
      END,
      file_extension = LOWER(SUBSTRING(filename FROM '\\.([^.]+)$')),
      file_size_mb = ROUND(size::DECIMAL / 1048576.0, 2),
      file_type = CASE 
        WHEN category::text = 'image' THEN 'image'
        WHEN category::text = 'contract' THEN 'pdf'
        ELSE LOWER(category::text)
      END,
      file_path = path,
      storage_provider = 'LOCAL',
      uploaded_by = COALESCE(created_by, 1),
      uploaded_at = COALESCE(created_at, NOW()),
      is_deleted = false
    WHERE reference_id IS NULL;
  `);

  // Step 3: Make new columns NOT NULL (after data migration)
  try {
    await queryInterface.changeColumn('files', 'reference_id', {
      allowNull: false,
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    console.log('Note: Could not make reference_id NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'reference_type', {
      allowNull: false,
      type: DataTypes.STRING(100),
    });
  } catch (error: any) {
    console.log('Note: Could not make reference_type NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'file_extension', {
      allowNull: false,
      type: DataTypes.STRING(20),
    });
  } catch (error: any) {
    console.log('Note: Could not make file_extension NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'file_size_mb', {
      allowNull: false,
      type: DataTypes.DECIMAL(10, 2),
    });
  } catch (error: any) {
    console.log('Note: Could not make file_size_mb NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'file_type', {
      allowNull: false,
      type: DataTypes.STRING(50),
    });
  } catch (error: any) {
    console.log('Note: Could not make file_type NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'file_path', {
      allowNull: false,
      type: DataTypes.STRING(500),
    });
  } catch (error: any) {
    console.log('Note: Could not make file_path NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'storage_provider', {
      allowNull: false,
      defaultValue: 'LOCAL',
      type: DataTypes.STRING(100),
    });
  } catch (error: any) {
    console.log('Note: Could not make storage_provider NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'uploaded_by', {
      allowNull: false,
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    console.log('Note: Could not make uploaded_by NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'uploaded_at', {
      allowNull: false,
      defaultValue: DataTypes.NOW,
      type: DataTypes.DATE,
    });
  } catch (error: any) {
    console.log('Note: Could not make uploaded_at NOT NULL:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'is_deleted', {
      allowNull: false,
      defaultValue: false,
      type: DataTypes.BOOLEAN,
    });
  } catch (error: any) {
    console.log('Note: Could not make is_deleted NOT NULL:', error.message);
  }

  // Step 4: Change id column to UUID (if it's currently INTEGER)
  try {
    // First, check if id is INTEGER
    const tableDescription = await queryInterface.describeTable('files');
    if (tableDescription.id?.type === 'INTEGER' || tableDescription.id?.type?.includes('integer')) {
      // Add a temporary UUID column
      await queryInterface.addColumn('files', 'id_new', {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      });

      // Populate the new UUID column
      await queryInterface.sequelize.query(`
        UPDATE files SET id_new = gen_random_uuid();
      `);

      // Drop old primary key constraint
      await queryInterface.removeConstraint('files', 'files_pkey');

      // Drop old id column
      await queryInterface.removeColumn('files', 'id');

      // Rename new column to id
      await queryInterface.renameColumn('files', 'id_new', 'id');

      // Add primary key constraint
      await queryInterface.addConstraint('files', {
        fields: ['id'],
        type: 'primary key',
        name: 'files_pkey',
      });
    }
  } catch (error: any) {
    console.log('Note: Could not change id to UUID:', error.message);
  }

  // Step 5: Add unique constraint on (reference_id, file_name)
  try {
    await queryInterface.addConstraint('files', {
      fields: ['reference_id', 'file_name'],
      type: 'unique',
      name: 'idx_files_reference',
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add unique constraint:', error.message);
    }
  }

  // Step 6: Add/update indexes
  try {
    await queryInterface.removeIndex('files', 'files_entity_type_entity_id_idx').catch(() => {});
    await queryInterface.addIndex('files', ['reference_type', 'reference_id'], {
      name: 'files_reference_type_reference_id_idx',
    });
  } catch (error: any) {
    console.log('Note: Could not update index:', error.message);
  }

  try {
    await queryInterface.addIndex('files', ['file_type'], {
      name: 'files_file_type_idx',
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add file_type index:', error.message);
    }
  }

  try {
    await queryInterface.addIndex('files', ['storage_provider'], {
      name: 'files_storage_provider_idx',
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add storage_provider index:', error.message);
    }
  }

  try {
    await queryInterface.addIndex('files', ['is_deleted'], {
      name: 'files_is_deleted_idx',
    });
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.log('Note: Could not add is_deleted index:', error.message);
    }
  }

  // Step 7: Add foreign key constraints
  const usersTableExists = await tableExists('users');
  if (usersTableExists) {
    try {
      await queryInterface.addConstraint('files', {
        fields: ['uploaded_by'],
        type: 'foreign key',
        name: 'files_uploaded_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.log('Note: Could not add uploaded_by foreign key:', error.message);
      }
    }

    try {
      await queryInterface.addConstraint('files', {
        fields: ['deleted_by'],
        type: 'foreign key',
        name: 'files_deleted_by_fkey',
        references: {
          table: 'users',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.log('Note: Could not add deleted_by foreign key:', error.message);
      }
    }
  }

  // Step 8: Drop old columns (optional - can be done in a separate migration)
  // We'll keep old columns for now to ensure backward compatibility
  // They can be dropped in a future migration after verifying everything works
};

export const down = async (queryInterface: QueryInterface) => {
  // This is a complex migration, so the down migration would need to reverse all changes
  // For now, we'll just log a warning
  console.log('Warning: Down migration for files table restructure is complex and may cause data loss.');
  console.log('Please backup your data before running this migration.');
  
  // Optionally, you could implement the reverse migration here
  // But it's safer to restore from backup
};


