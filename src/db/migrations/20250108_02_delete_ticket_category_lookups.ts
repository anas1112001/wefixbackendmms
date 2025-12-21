import { QueryInterface, QueryTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  console.log('🔄 Deleting TicketCategory lookups...');

  try {
    // Delete all lookups with category = 'TicketCategory'
    // Cast category to text to avoid enum validation issues when the enum value has been removed
    const [results] = await queryInterface.sequelize.query(
      `DELETE FROM lookups WHERE category::text = 'TicketCategory' RETURNING id, name;`,
      { type: QueryTypes.SELECT }
    ) as [{ id: number; name: string }[], unknown];

    if (Array.isArray(results) && results.length > 0) {
      console.log(`   ✅ Deleted ${results.length} TicketCategory lookup(s):`);
      results.forEach((row) => {
        console.log(`      - ID: ${row.id}, Name: ${row.name}`);
      });
    } else {
      console.log('   ⚠️  No TicketCategory lookups found to delete');
    }
  } catch (error: any) {
    console.error('   ❌ Error deleting TicketCategory lookups:', error.message);
    throw error;
  }
};

export const down = async (queryInterface: QueryInterface) => {
  console.log('🔄 Re-adding TicketCategory lookups...');

  try {
    // Re-insert the TicketCategory lookups
    const ticketCategories = [
      {
        category: 'TicketCategory',
        code: 'INSTALLATION',
        description: 'Installation ticket category',
        id: 60,
        isActive: true,
        isDefault: false,
        name: 'installation',
        nameArabic: 'تركيب',
        orderId: 1,
        parentLookupId: null,
      },
      {
        category: 'TicketCategory',
        code: 'INSPECTION',
        description: 'Inspection ticket category',
        id: 61,
        isActive: true,
        isDefault: false,
        name: 'inspection',
        nameArabic: 'فحص',
        orderId: 2,
        parentLookupId: null,
      },
    ];

    for (const category of ticketCategories) {
      await queryInterface.sequelize.query(
        `INSERT INTO lookups (id, category, name, name_arabic, code, description, order_id, is_default, is_active, parent_lookup_id, created_at, updated_at, is_deleted)
         VALUES (:id, :category, :name, :nameArabic, :code, :description, :orderId, :isDefault, :isActive, :parentLookupId, NOW(), NOW(), false)
         ON CONFLICT (id) DO NOTHING;`,
        {
          replacements: {
            category: category.category,
            code: category.code,
            description: category.description,
            id: category.id,
            isActive: category.isActive,
            isDefault: category.isDefault,
            name: category.name,
            nameArabic: category.nameArabic,
            orderId: category.orderId,
            parentLookupId: category.parentLookupId,
          },
        }
      );
    }

    console.log(`   ✅ Re-added ${ticketCategories.length} TicketCategory lookup(s)`);
  } catch (error: any) {
    console.error('   ❌ Error re-adding TicketCategory lookups:', error.message);
    throw error;
  }
};


