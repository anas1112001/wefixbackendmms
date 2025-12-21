import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('Making reference_id, reference_type, and entity_id nullable in files table...');
  
  try {
    await queryInterface.changeColumn('files', 'reference_id', {
      allowNull: true,
      comment: 'ID of the entity this file belongs to (TicketId, CompanyId, UserId, etc.)',
      type: DataTypes.INTEGER,
    });
    console.log('✓ Made reference_id nullable');
  } catch (error: any) {
    console.log('Note: Could not make reference_id nullable:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'reference_type', {
      allowNull: true,
      comment: 'Type of entity this file belongs to (TICKET_ATTACHMENT, COMPANY, USER, LOGO, CONTRACT, etc.)',
      type: DataTypes.STRING(100),
    });
    console.log('✓ Made reference_type nullable');
  } catch (error: any) {
    console.log('Note: Could not make reference_type nullable:', error.message);
  }

  // Make entity_id nullable (legacy column)
  try {
    await queryInterface.changeColumn('files', 'entity_id', {
      allowNull: true,
      comment: 'DEPRECATED: Use referenceId instead',
      type: DataTypes.INTEGER,
    });
    console.log('✓ Made entity_id nullable');
  } catch (error: any) {
    console.log('Note: Could not make entity_id nullable:', error.message);
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('Reverting reference_id, reference_type, and entity_id to NOT NULL in files table...');
  
  try {
    await queryInterface.changeColumn('files', 'reference_id', {
      allowNull: false,
      comment: 'ID of the entity this file belongs to (TicketId, CompanyId, UserId, etc.)',
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    console.log('Note: Could not revert reference_id:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'reference_type', {
      allowNull: false,
      comment: 'Type of entity this file belongs to (TICKET_ATTACHMENT, COMPANY, USER, LOGO, CONTRACT, etc.)',
      type: DataTypes.STRING(100),
    });
  } catch (error: any) {
    console.log('Note: Could not revert reference_type:', error.message);
  }

  try {
    await queryInterface.changeColumn('files', 'entity_id', {
      allowNull: false,
      comment: 'DEPRECATED: Use referenceId instead',
      type: DataTypes.INTEGER,
    });
  } catch (error: any) {
    console.log('Note: Could not revert entity_id:', error.message);
  }
};

