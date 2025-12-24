import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('\n🔄 Updating ticket_code_id format to {COMPANY_NAME}-TKT-{TICKET_ID}...');

  // Get all tickets with their companies
  const [tickets] = await queryInterface.sequelize.query(`
    SELECT 
      t.id as ticket_id,
      t.ticket_code_id as current_code,
      c.title as company_title
    FROM tickets t
    INNER JOIN companies c ON t.company_id = c.id
    WHERE t.is_deleted = false
    ORDER BY t.id ASC
  `) as [Array<{ ticket_id: number; current_code: string; company_title: string }>, unknown];

  console.log(`   Found ${tickets.length} tickets to update`);

  let updatedCount = 0;
  for (const ticket of tickets) {
    // Extract company name from title and convert to uppercase (e.g., "gamma solutions" -> "GAMMA")
    const companyName = ticket.company_title.toUpperCase().split(' ')[0];
    const newTicketCodeId = `${companyName}-TKT-${ticket.ticket_id}`;

    // Only update if the code is different
    if (ticket.current_code !== newTicketCodeId) {
      await queryInterface.sequelize.query(`
        UPDATE tickets
        SET ticket_code_id = :newCode
        WHERE id = :ticketId
      `, {
        replacements: {
          newCode: newTicketCodeId,
          ticketId: ticket.ticket_id,
        },
      });

      updatedCount++;
      if (updatedCount % 50 === 0) {
        console.log(`   Updated ${updatedCount} tickets...`);
      }
    }
  }

  console.log(`   ✅ Updated ${updatedCount} ticket codes`);
  console.log(`   📝 Format: {COMPANY_NAME}-TKT-{TICKET_ID} (e.g., GAMMA-TKT-195)`);
};

export const down = async (queryInterface: QueryInterface) => {
  // Reverting this migration is not straightforward since we don't know the original format
  // The down migration will be a no-op
  console.log('   ⚠️  Cannot revert ticket_code_id format update. Manual intervention required.');
};

