import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add TICKET_PROCESS to the enum_lookups_category enum
  await queryInterface.sequelize.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'TicketProcess' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_lookups_category')
      ) THEN
        ALTER TYPE "enum_lookups_category" ADD VALUE 'TicketProcess';
      END IF;
    END $$;
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Note: PostgreSQL does not support removing enum values directly
  // This would require recreating the enum type, which is complex
  // For now, we'll leave this as a no-op
  console.log('   ⚠️  Down migration is a no-op - enum values cannot be easily removed');
}





