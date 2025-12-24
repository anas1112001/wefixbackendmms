import 'reflect-metadata';
import { QueryTypes } from 'sequelize';

import { BRANCHES_DATA } from './branchesSeed';
import { COMPANIES_DATA } from './companiesSeed';
import { CONTRACTS_DATA } from './contractsSeed';
import { LOOKUP_DATA, BUSINESS_MODELS, MANAGED_BY, STATES } from './lookupsSeed';
import { MAIN_SERVICES_DATA, SUB_SERVICES_DATA } from './mainServicesSeed';
import { MAINTENANCE_SERVICES_DATA } from './maintenanceServicesSeed';
import { TICKETS_DATA } from './ticketsSeed';
import { TOOLS } from './toolsSeed';
import { USER_DATA } from './usersSeed';

// Password: Jadcom@1100 (hashed with bcrypt)
const hashedPassword = '$2b$10$Q4bQvCwOaZZYpLm5aYvWauQx5lfuY.zXzXk3knSiro2VO1iMyHOy6';
import { ZONES_DATA, SALT_BRANCH_ZONES } from './zonesSeed';

import { Branch } from '../models/branch.model';
import { Company } from '../models/company.model';
import { Contract } from '../models/contract.model';
import { CompanyStatus } from '../models/enums';
import { File, FileCategory, FileEntityType } from '../models/file.model';
import { Lookup, LookupCategory } from '../models/lookup.model';
import { MaintenanceService } from '../models/maintenance-service.model';
import { Ticket } from '../models/ticket.model';
import { User } from '../models/user.model';
import { Zone } from '../models/zone.model';
import { orm } from '../orm';

/**
 * Seed lookups table
 */
export const seedLookups = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding lookups...');

    // Check if table exists first
    let existingLookups = 0;
    try {
      existingLookups = await Lookup.count();
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        console.log('   ⚠️  Lookups table does not exist yet. Please run migrations first.');
        console.log('   💡 Run: npm run migrate:up');
        return;
      }
      throw error;
    }

    if (existingLookups > 0 && !force) {
      console.log(`   Found ${existingLookups} existing lookups. Skipping seed.`);
      return;
    }

    if (force) {
      await Lookup.destroy({ where: {}, force: true });
      console.log('   Cleared existing lookups.');
    }

    let createdCount = 0;
    let skippedCount = 0;
    for (const lookup of LOOKUP_DATA) {
      try {
        // Check if lookup with this ID already exists
        const existing = await Lookup.findByPk(lookup.id);
        if (existing) {
          if (force) {
            // Update existing lookup
            await existing.update({
              category: lookup.category,
              code: lookup.code,
              description: lookup.description,
              icon: (lookup as any).icon || null,
              isActive: lookup.isActive,
              isDefault: lookup.isDefault,
              name: lookup.name,
              nameArabic: lookup.nameArabic,
              orderId: lookup.orderId,
              parentLookupId: lookup.parentLookupId,
            });
            createdCount++;
          } else {
            skippedCount++;
          }
          continue;
        }

        // Create new lookup
        await Lookup.create({
          category: lookup.category,
          code: lookup.code,
          description: lookup.description,
          icon: (lookup as any).icon || null,
          id: lookup.id,
          isActive: lookup.isActive,
          isDefault: lookup.isDefault,
          name: lookup.name,
          nameArabic: lookup.nameArabic,
          orderId: lookup.orderId,
          parentLookupId: lookup.parentLookupId,
        });
        createdCount++;
      } catch (error: any) {
        // Handle duplicate key errors gracefully
        if (error.name === 'SequelizeUniqueConstraintError' || 
            (error.parent && error.parent.code === '23505')) {
          skippedCount++;
          continue;
        }
        console.error(`   ⚠️  Error creating lookup ${lookup.id} (${lookup.name}):`, error.message);
      }
    }

    if (skippedCount > 0) {
      console.log(`   ⚠️  Skipped ${skippedCount} existing lookups. Use --force to update them.`);
    }

    // Show breakdown by category
    const categoryCounts = new Map<LookupCategory, number>();
    for (const lookup of LOOKUP_DATA) {
      const count = categoryCounts.get(lookup.category) || 0;
      categoryCounts.set(lookup.category, count + 1);
    }

    console.log(`   ✅ Seeded ${createdCount} lookups`);
    console.log('   📊 Breakdown by category:');
    for (const [category, count] of categoryCounts.entries()) {
      console.log(`      - ${category}: ${count}`);
    }
  } catch (error: any) {
    console.error('   ❌ Error seeding lookups:', error.message);
    throw error;
  }
};

/**
 * Seed users table
 */
export const seedUsers = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding users...');

    const companies = await Company.findAll({
      order: [['id', 'ASC']],
    });
    const existingUsers = await User.count();

    // Always update existing team leaders and technicians without company IDs (if companies exist)
    if (companies.length > 0) {
      console.log('\n   🔄 Updating existing team leaders and technicians without company IDs...');
      const existingTeamLeaders = await User.findAll({
        where: {
          userRoleId: 20, // Team Leader
          companyId: null,
          isDeleted: false,
        },
        order: [['id', 'ASC']],
      });

      const existingTechnicians = await User.findAll({
        where: {
          userRoleId: 21, // Technician
          companyId: null,
          isDeleted: false,
        },
        order: [['id', 'ASC']],
      });

      let updatedTeamLeaders = 0;
      let updatedTechnicians = 0;

      // Assign existing team leaders to companies (3 per company, sequentially)
      // First 3 → Company 1, Next 3 → Company 2, etc.
      for (let i = 0; i < existingTeamLeaders.length; i++) {
        const teamLeader = existingTeamLeaders[i];
        const companyIndex = Math.floor(i / 3); // Group of 3 per company

        if (companyIndex < companies.length) {
          const company = companies[companyIndex];

          if (company) {
            await teamLeader.update({ companyId: company.id });
            updatedTeamLeaders++;
            console.log(`      ✅ Updated Team Leader ${teamLeader.email || teamLeader.userNumber} → Company ID: ${company.id} (${(company as any).title || `Company ${companyIndex + 1}`})`);
          }
        } else {
          console.log(`      ⚠️  Skipping Team Leader ${teamLeader.email || teamLeader.userNumber} - No more companies available`);
        }
      }

      // Assign existing technicians to companies (3 per company, sequentially)
      // First 3 → Company 1, Next 3 → Company 2, etc.
      for (let i = 0; i < existingTechnicians.length; i++) {
        const technician = existingTechnicians[i];
        const companyIndex = Math.floor(i / 3); // Group of 3 per company

        if (companyIndex < companies.length) {
          const company = companies[companyIndex];

          if (company) {
            await technician.update({ companyId: company.id });
            updatedTechnicians++;
            console.log(`      ✅ Updated Technician ${technician.email || technician.userNumber} → Company ID: ${company.id} (${(company as any).title || `Company ${companyIndex + 1}`})`);
          }
        } else {
          console.log(`      ⚠️  Skipping Technician ${technician.email || technician.userNumber} - No more companies available`);
        }
      }

      if (updatedTeamLeaders > 0 || updatedTechnicians > 0) {
        console.log(`   ✅ Updated ${updatedTeamLeaders} team leaders and ${updatedTechnicians} technicians with company IDs`);
      } else {
        console.log('   ℹ️  No team leaders or technicians found without company IDs');
      }
    } else {
      console.log('   ⚠️  No companies found. Skipping team leader/technician company assignment.');
    }

    if (existingUsers > 0 && !force) {
      console.log(`   Found ${existingUsers} existing users. Skipping new user creation.`);
      return;
    }

    if (force) {
      await User.destroy({ where: {}, force: true });
      console.log('   Cleared existing users.');
    }

    // Create a map from seed index (1-based) to actual company ID
    // This maps the position in COMPANIES_DATA array to the actual database ID
    const companyIdMap = new Map<number, number>();
    console.log(`   📊 Found ${companies.length} companies in database`);
    console.log(`   📋 Looking for ${COMPANIES_DATA.length} companies from seed data`);
    
    for (let i = 0; i < COMPANIES_DATA.length; i++) {
      const seedCompany = COMPANIES_DATA[i];
      const dbCompany = companies.find(c => (c as any).companyId === seedCompany.companyId);
      if (dbCompany) {
        companyIdMap.set(i + 1, dbCompany.id);
        console.log(`   🔗 Mapped company index ${i + 1} (${seedCompany.companyId} - ${seedCompany.title}) → DB ID: ${dbCompany.id}`);
      } else {
        console.log(`   ⚠️  Company not found in database: ${seedCompany.companyId} (${seedCompany.title})`);
      }
    }
    
    if (companyIdMap.size === 0) {
      console.log('   ⚠️  Warning: No companies found in database. Users with companyId will have null companyId.');
    }

    for (const userData of USER_DATA) {
      try {
        let actualCompanyId: number | null = null;
        if (userData.companyId !== null && userData.companyId !== undefined) {
          actualCompanyId = companyIdMap.get(userData.companyId) || null;
          if (!actualCompanyId && userData.companyId !== null) {
            console.log(`   ⚠️  Warning: Could not find company for index ${userData.companyId} for user ${userData.email || userData.userNumber}`);
            console.log(`      Available company mappings: ${Array.from(companyIdMap.entries()).map(([k, v]) => `${k}→${v}`).join(', ')}`);
          } else if (actualCompanyId) {
            console.log(`   ✅ User ${userData.email || userData.userNumber} → Company ID: ${actualCompanyId} (from seed index ${userData.companyId})`);
          }
        }

        // Build English full name from firstName and lastName
        const parts = [userData.firstName, userData.lastName].filter(Boolean);
        const fullNameEnglish = (parts.length > 0 ? parts.join(' ').trim() : 'WeFix User') || 'WeFix User';

        // Use Arabic name if provided, otherwise use English name
        const fullNameArabic = (userData as any).fullNameArabic?.trim();
        const fullName = (fullNameArabic && fullNameArabic.length > 0) ? fullNameArabic : fullNameEnglish;

        // Ensure both fields are never null or empty
        const finalFullName = fullName && fullName.length > 0 ? fullName : 'WeFix User';
        const finalFullNameEnglish = fullNameEnglish && fullNameEnglish.length > 0 ? fullNameEnglish : 'WeFix User';

        const userCreateData: any = {
          email: userData.email,
          fullName: finalFullName,
          fullNameEnglish: finalFullNameEnglish,
          userNumber: userData.userNumber,
          password: userData.password,
          userRoleId: userData.userRoleId,
          companyId: actualCompanyId,
          deviceId: userData.deviceId,
          fcmToken: userData.fcmToken,
          mobileNumber: userData.mobileNumber || null,
          countryCode: userData.countryCode || '+962',
          isActive: true,
          isDeleted: false,
        };

        if (userData.username) {
          userCreateData.username = userData.username;
        }

        const newUser = await User.create(userCreateData);

        // Create File record for user image if provided
        const userImage = (userData as any).image;
        if (userImage && newUser.id) {
          try {
            const filename = userImage.split('/').pop() || 'profile.jpg';
            const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeTypes: Record<string, string> = {
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              gif: 'image/gif',
              webp: 'image/webp',
            };
            const mimeType = mimeTypes[extension] || 'image/jpeg';

            await File.create({
              filename,
              originalFilename: filename,
              path: userImage,
              mimeType,
              size: 0,
              category: FileCategory.IMAGE,
              entityType: FileEntityType.USER,
              entityId: newUser.id,
              createdBy: null,
              updatedBy: null,
            });
          } catch (error: any) {
            console.error(`   ⚠️  Error creating File record for user ${userData.email} image:`, error.message);
          }
        }
      } catch (error: any) {
        console.error(`   ⚠️  Error creating user ${userData.email}:`, error.message);
      }
    }

    // Get the highest user number to continue numbering
    const lastUser = await User.findOne({
      order: [['userNumber', 'DESC']],
    });
    let userNumberCounter = lastUser ? parseInt(lastUser.userNumber.replace('USR', '')) : 0;

    // Password: Jadcom@1100 (hashed with bcrypt)
    const hashedPassword = '$2b$10$Q4bQvCwOaZZYpLm5aYvWauQx5lfuY.zXzXk3knSiro2VO1iMyHOy6';

    // Seed 3 team leaders and 3 technicians for each company
    const teamLeaderNames = [
      { firstName: 'Ahmad', lastName: 'Salem', nameArabic: 'أحمد سالم' },
      { firstName: 'Sara', lastName: 'Khalil', nameArabic: 'سارة خليل' },
      { firstName: 'Omar', lastName: 'Hassan', nameArabic: 'عمر حسن' },
    ];

    const technicianNames = [
      { firstName: 'Mohammed', lastName: 'Ali', nameArabic: 'محمد علي' },
      { firstName: 'Layla', lastName: 'Ahmad', nameArabic: 'ليلى أحمد' },
      { firstName: 'Khaled', lastName: 'Omar', nameArabic: 'خالد عمر' },
    ];

    let createdTeamLeaders = 0;
    let createdTechnicians = 0;
    const teamLeadersByCompany: { companyId: number; companyTitle: string; teamLeaders: { email: string; fullName: string; userNumber: string }[] }[] = [];
    const techniciansByCompany: { companyId: number; companyTitle: string; technicians: { email: string; fullName: string; userNumber: string }[] }[] = [];

    for (let companyIndex = 0; companyIndex < companies.length; companyIndex++) {
      const company = companies[companyIndex];
      const actualCompanyId = company.id;
      const companyTitle = (company as any).title || `Company ${companyIndex + 1}`;

      console.log(`   📦 Processing Company ${companyIndex + 1}: ${companyTitle} (ID: ${actualCompanyId})`);

      // Create 3 team leaders for this company
      const companyTeamLeaders: { email: string; fullName: string; userNumber: string }[] = [];
      for (let i = 0; i < 3; i++) {
        try {
          userNumberCounter++;
          const userNumber = `USR${userNumberCounter.toString().padStart(3, '0')}`;
          const name = teamLeaderNames[i];
          const fullNameEnglish = `${name.firstName} ${name.lastName}`;
          const fullName = name.nameArabic || fullNameEnglish;
          const email = `teamlead${companyIndex + 1}-${i + 1}@wefix.com`;
          const username = `TL${(companyIndex + 1).toString().padStart(2, '0')}${(i + 1).toString().padStart(2, '0')}`;
          const mobileNumber = `791234${(userNumberCounter + 100).toString().padStart(3, '0')}`;

          const teamLeader = await User.create({
            email,
            fullName,
            fullNameEnglish,
            userNumber,
            password: hashedPassword,
            userRoleId: 20, // Team Leader
            companyId: actualCompanyId,
            deviceId: `mobile-teamlead-${companyIndex + 1}-${i + 1}`,
            fcmToken: `fcm-token-teamlead-${companyIndex + 1}-${i + 1}`,
            mobileNumber,
            countryCode: '+962',
            username,
            isActive: true,
            isDeleted: false,
          });

          companyTeamLeaders.push({
            email,
            fullName,
            userNumber,
          });

          console.log(`      ✅ Created Team Leader: ${fullName} (${email}) - Company ID: ${actualCompanyId}`);

          createdTeamLeaders++;
        } catch (error: any) {
          console.error(`   ⚠️  Error creating team leader for company ${companyIndex + 1}:`, error.message);
        }
      }

      teamLeadersByCompany.push({
        companyId: actualCompanyId,
        companyTitle,
        teamLeaders: companyTeamLeaders,
      });

      // Create 3 technicians for this company
      const companyTechnicians: { email: string; fullName: string; userNumber: string }[] = [];
      for (let i = 0; i < 3; i++) {
        try {
          userNumberCounter++;
          const userNumber = `USR${userNumberCounter.toString().padStart(3, '0')}`;
          const name = technicianNames[i];
          const fullNameEnglish = `${name.firstName} ${name.lastName}`;
          const fullName = name.nameArabic || fullNameEnglish;
          const email = `tech${companyIndex + 1}-${i + 1}@wefix.com`;
          const username = `TCH${(companyIndex + 1).toString().padStart(2, '0')}${(i + 1).toString().padStart(2, '0')}`;
          const mobileNumber = `791234${(userNumberCounter + 100).toString().padStart(3, '0')}`;

          const technician = await User.create({
            email,
            fullName,
            fullNameEnglish,
            userNumber,
            password: hashedPassword,
            userRoleId: 21, // Technician
            companyId: actualCompanyId,
            deviceId: `mobile-tech-${companyIndex + 1}-${i + 1}`,
            fcmToken: `fcm-token-tech-${companyIndex + 1}-${i + 1}`,
            mobileNumber,
            countryCode: '+962',
            username,
            isActive: true,
            isDeleted: false,
          });

          companyTechnicians.push({
            email,
            fullName,
            userNumber,
          });

          console.log(`      ✅ Created Technician: ${fullName} (${email}) - Company ID: ${actualCompanyId}`);

          createdTechnicians++;
        } catch (error: any) {
          console.error(`   ⚠️  Error creating technician for company ${companyIndex + 1}:`, error.message);
        }
      }

      techniciansByCompany.push({
        companyId: actualCompanyId,
        companyTitle,
        technicians: companyTechnicians,
      });
    }

    console.log(`   ✅ Seeded ${USER_DATA.length} users from USER_DATA`);
    console.log(`   ✅ Created ${createdTeamLeaders} team leaders (3 per company)`);
    console.log(`   ✅ Created ${createdTechnicians} technicians (3 per company)`);
    console.log('\n   📊 Team Leaders by Company:');
    teamLeadersByCompany.forEach((company) => {
      console.log(`      Company: ${company.companyTitle} (ID: ${company.companyId})`);
      company.teamLeaders.forEach((leader) => {
        console.log(`         - ${leader.fullName} (${leader.email}) - User Number: ${leader.userNumber}`);
      });
    });
    console.log('\n   📊 Technicians by Company:');
    techniciansByCompany.forEach((company) => {
      console.log(`      Company: ${company.companyTitle} (ID: ${company.companyId})`);
      company.technicians.forEach((tech) => {
        console.log(`         - ${tech.fullName} (${tech.email}) - User Number: ${tech.userNumber}`);
      });
    });
    console.log('\n   📋 Default password for all users: Jadcom@1100');
  } catch (error: any) {
    console.error('   ❌ Error seeding users:', error.message);
    throw error;
  }
};

/**
 * Seed companies table
 */
export const seedCompanies = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding companies...');

    const countries = await Lookup.findAll({
      where: { category: LookupCategory.COUNTRY, isActive: true },
    });

    if (countries.length === 0) {
      throw new Error('No countries found. Please seed lookups first.');
    }

    const existingCompanies = await Company.count();
    if (existingCompanies > 0 && !force) {
      console.log(`   Found ${existingCompanies} existing companies. Skipping seed.`);
      return;
    }

    if (force) {
      await Company.destroy({ where: {}, force: true });
      console.log('   Cleared existing companies.');
    }

    let createdCount = 0;
    for (let i = 0; i < COMPANIES_DATA.length; i++) {
      const companyData = COMPANIES_DATA[i];

      try {
        const existing = await Company.findOne({ where: { companyId: companyData.companyId } });
        if (existing) {
          continue;
        }

        const country = countries[i % countries.length];

        const [result] = await orm.sequelize.query(`
          INSERT INTO companies (
            company_id, title, company_name_arabic, company_name_english,
            country_lookup_id, ho_address, ho_location, is_active, logo,
            ticket_short_code, created_at, updated_at
          ) VALUES (
            :companyId, :title, :companyNameArabic, :companyNameEnglish,
            :countryLookupId, :hoAddress, :hoLocation, :isActive, :logo,
            :ticketShortCode, NOW(), NOW()
          ) RETURNING id
        `, {
          replacements: {
            companyId: companyData.companyId,
            title: companyData.title.toLowerCase(),
            companyNameArabic: companyData.companyNameArabic,
            companyNameEnglish: companyData.companyNameEnglish,
            countryLookupId: country.id,
            hoAddress: companyData.hoAddress,
            hoLocation: companyData.hoLocation,
            isActive: companyData.isActive ? CompanyStatus.ACTIVE : CompanyStatus.INACTIVE,
            logo: companyData.logo,
            ticketShortCode: companyData.ticketShortCode,
          },
          type: QueryTypes.SELECT,
        });

        const companyId = (result as any[])[0]?.id;

        // Create File record for logo if provided
        if (companyData.logo && companyId) {
          try {
            const filename = companyData.logo.split('/').pop() || 'logo.jpg';
            const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeTypes: Record<string, string> = {
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              gif: 'image/gif',
              webp: 'image/webp',
            };
            const mimeType = mimeTypes[extension] || 'image/jpeg';

            await File.create({
              filename,
              originalFilename: filename,
              path: companyData.logo,
              mimeType,
              size: 0,
              category: FileCategory.IMAGE,
              entityType: FileEntityType.COMPANY,
              entityId: companyId,
              createdBy: null,
              updatedBy: null,
            });
          } catch (error: any) {
            console.error(`   ⚠️  Error creating File record for company ${companyData.companyId} logo:`, error.message);
          }
        }

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating company ${companyData.companyId}:`, error.message);
      }
    }

    console.log(`   ✅ Seeded ${createdCount} companies`);
  } catch (error: any) {
    console.error('   ❌ Error seeding companies:', error.message);
    throw error;
  }
};

/**
 * Assigns company IDs to team leaders and technicians (3 per company)
 * This should be called after both users and companies are seeded
 */
export const assignTeamLeadersAndTechniciansToCompanies = async (): Promise<void> => {
  try {
    console.log('\n🔗 Assigning team leaders and technicians to companies (3 per company)...');

    const companies = await Company.findAll({
      order: [['id', 'ASC']],
    });

    console.log(`   📊 Found ${companies.length} companies`);

    if (companies.length === 0) {
      console.log('   ⚠️  No companies found. Skipping assignment.');
      return;
    }

    // Get all team leaders without company IDs
    const teamLeaders = await User.findAll({
      where: {
        userRoleId: 20, // Team Leader
        companyId: null,
        isDeleted: false,
      },
      order: [['id', 'ASC']],
    });

    console.log(`   👥 Found ${teamLeaders.length} team leaders without company IDs`);

    // Debug: Check total team leaders
    const allTeamLeaders = await User.count({
      where: {
        userRoleId: 20,
        isDeleted: false,
      },
    });
    console.log(`   📈 Total team leaders in database: ${allTeamLeaders}`);

    // Get all technicians without company IDs
    const technicians = await User.findAll({
      where: {
        userRoleId: 21, // Technician
        companyId: null,
        isDeleted: false,
      },
      order: [['id', 'ASC']],
    });

    console.log(`   🔧 Found ${technicians.length} technicians without company IDs`);

    // Debug: Check total technicians
    const allTechnicians = await User.count({
      where: {
        userRoleId: 21,
        isDeleted: false,
      },
    });
    console.log(`   📈 Total technicians in database: ${allTechnicians}`);

    let assignedTeamLeaders = 0;
    let assignedTechnicians = 0;

    // Assign team leaders: 3 per company
    for (let i = 0; i < teamLeaders.length; i++) {
      const teamLeader = teamLeaders[i];
      const companyIndex = Math.floor(i / 3) % companies.length;
      const company = companies[companyIndex];

      if (company) {
        await teamLeader.update({ companyId: company.id });
        assignedTeamLeaders++;
        const companyTitle = (company as any).title || `Company ${companyIndex + 1}`;
        console.log(`   ✅ Assigned Team Leader ${teamLeader.email || teamLeader.userNumber} → Company: ${companyTitle} (ID: ${company.id})`);
      }
    }

    // Assign technicians: 3 per company
    for (let i = 0; i < technicians.length; i++) {
      const technician = technicians[i];
      const companyIndex = Math.floor(i / 3) % companies.length;
      const company = companies[companyIndex];

      if (company) {
        await technician.update({ companyId: company.id });
        assignedTechnicians++;
        const companyTitle = (company as any).title || `Company ${companyIndex + 1}`;
        console.log(`   ✅ Assigned Technician ${technician.email || technician.userNumber} → Company: ${companyTitle} (ID: ${company.id})`);
      }
    }

    if (assignedTeamLeaders > 0 || assignedTechnicians > 0) {
      console.log(`   ✅ Successfully assigned ${assignedTeamLeaders} team leaders and ${assignedTechnicians} technicians to companies`);
    } else {
      console.log('   ℹ️  No team leaders or technicians found without company IDs');
    }
  } catch (error: any) {
    console.error('   ❌ Error assigning team leaders and technicians to companies:', error.message);
    throw error;
  }
};

/**
 * Seed contracts table
 */
export const seedContracts = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding contracts...');

    const companies = await Company.findAll({ limit: 10 });
    if (companies.length === 0) {
      throw new Error('No companies found. Please seed companies first.');
    }

    const businessModels = await Lookup.findAll({
      where: { category: LookupCategory.BUSINESS_MODEL, isActive: true },
    });
    if (businessModels.length === 0) {
      throw new Error('No business models found. Please seed lookups first.');
    }

    const existingContracts = await Contract.count();
    if (existingContracts > 0 && !force) {
      console.log(`   Found ${existingContracts} existing contracts. Skipping seed.`);
      return;
    }

    if (force) {
      await Contract.destroy({ where: {}, force: true });
      console.log('   Cleared existing contracts.');
    }

    const generateContractReference = (index: number) => {
      const year = new Date().getFullYear();
      const sequence = (index + 1).toString().padStart(3, '0');
      return `${sequence}-Cont${year}`;
    };

    let createdCount = 0;
    for (let i = 0; i < CONTRACTS_DATA.length; i++) {
      const contractData = CONTRACTS_DATA[i];
      const company = companies[i % companies.length];
      const businessModel = businessModels[i % businessModels.length];

      try {
        const newContract = await Contract.create({
          
          contractReference: generateContractReference(i),
          contractTitle: contractData.contractTitle,
          companyId: company.id,
          businessModelLookupId: businessModel.id,
          isActive: contractData.isActive,
          numberOfTeamLeaders: contractData.numberOfTeamLeaders,
          numberOfBranches: contractData.numberOfBranches,
          numberOfPreventiveTickets: contractData.numberOfPreventiveTickets,
          numberOfCorrectiveTickets: contractData.numberOfCorrectiveTickets,
          contractStartDate: contractData.contractStartDate,
          contractEndDate: contractData.contractEndDate,
          contractValue: contractData.contractValue,
          contractFiles: contractData.contractFiles,
          contractDescription: contractData.contractDescription,
        });

        // Create File records for contract files if provided
        if (contractData.contractFiles) {
          try {
            let filePaths: string[] = [];
            if (typeof contractData.contractFiles === 'string') {
              try {
                filePaths = JSON.parse(contractData.contractFiles);
              } catch {
                filePaths = [contractData.contractFiles];
              }
            } else if (Array.isArray(contractData.contractFiles)) {
              filePaths = contractData.contractFiles;
            }

            for (const filePath of filePaths) {
              if (filePath) {
                const filename = filePath.split('/').pop() || 'contract.pdf';
                const extension = filename.split('.').pop()?.toLowerCase() || 'pdf';
                const mimeTypes: Record<string, string> = {
                  pdf: 'application/pdf',
                  doc: 'application/msword',
                  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  xls: 'application/vnd.ms-excel',
                  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  jpg: 'image/jpeg',
                  jpeg: 'image/jpeg',
                  png: 'image/png',
                };
                const mimeType = mimeTypes[extension] || 'application/octet-stream';

                await File.create({
                  filename,
                  originalFilename: filename,
                  path: filePath,
                  mimeType,
                  size: 0,
                  category: FileCategory.CONTRACT,
                  entityType: FileEntityType.CONTRACT,
                  entityId: newContract.id,
                  createdBy: null,
                  updatedBy: null,
                });
              }
            }
          } catch (error: any) {
            console.error(`   ⚠️  Error creating File records for contract ${newContract.contractReference}:`, error.message);
          }
        }

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating contract:`, error.message);
      }
    }

    console.log(`   ✅ Seeded ${createdCount} contracts`);
  } catch (error: any) {
    console.error('   ❌ Error seeding contracts:', error.message);
    throw error;
  }
};

/**
 * Seed branches table
 */
export const seedBranches = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding branches...');

    const companies = await Company.findAll();
    if (companies.length === 0) {
      throw new Error('No companies found. Please seed companies first.');
    }

    const existingBranches = await Branch.count();
    if (existingBranches > 0 && !force) {
      console.log(`   Found ${existingBranches} existing branches. Skipping seed.`);
      return;
    }

    if (force) {
      await Branch.destroy({ where: {}, force: true });
      console.log('   Cleared existing branches.');
    }

    const companyIdMap = new Map<number, number>();
    companies.forEach((company, index) => {
      companyIdMap.set(index + 1, company.id);
    });

    let createdCount = 0;
    for (const branchData of BRANCHES_DATA) {
      try {
        const actualCompanyId = companyIdMap.get(branchData.companyId) || companies[0].id;

        await Branch.create({
          branchTitle: branchData.branchTitle,
          branchNameArabic: branchData.branchNameArabic,
          branchNameEnglish: branchData.branchNameEnglish,
          branchRepresentativeName: null,
          representativeMobileNumber: null,
          representativeEmailAddress: null,
          companyId: actualCompanyId,
          teamLeaderLookupId: null,
          isActive: branchData.isActive,
          location: branchData.locationMap || null,
        });

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating branch:`, error.message);
      }
    }

    console.log(`   ✅ Seeded ${createdCount} branches`);
  } catch (error: any) {
    console.error('   ❌ Error seeding branches:', error.message);
    throw error;
  }
};

/**
 * Seed zones table
 */
export const seedZones = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding zones...');

    // Check if table exists first
    let branches: Branch[] = [];
    try {
      branches = await Branch.findAll();
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        console.log('   ⚠️  Branches table does not exist yet. Please run migrations first.');
        return;
      }
      throw error;
    }

    if (branches.length === 0) {
      console.log('   ⚠️  No branches found. Please seed branches first.');
      return;
    }

    let existingZones = 0;
    try {
      existingZones = await Zone.count();
    } catch (error: any) {
      if (error.message && error.message.includes('does not exist')) {
        console.log('   ⚠️  Zones table does not exist yet. Please run migrations first.');
        return;
      }
      throw error;
    }

    if (existingZones > 0 && !force) {
      console.log(`   Found ${existingZones} existing zones. Skipping seed.`);
      return;
    }

    if (force) {
      await Zone.destroy({ where: {}, force: true });
      console.log('   Cleared existing zones.');
    }

    const branchIdMap = new Map<number, number>();
    branches.forEach((branch, index) => {
      branchIdMap.set(index + 1, branch.id);
    });

    // Find Salt Branch for Gamma Solutions (companyId: 2)
    const saltBranch = branches.find(
      (branch) => branch.branchTitle === 'Salt Branch' || branch.branchNameEnglish === 'Salt Branch'
    );

    let createdCount = 0;
    
    // Create zones for all branches (existing logic)
    for (let i = 0; i < ZONES_DATA.length; i++) {
      const zoneData = ZONES_DATA[i];
      try {
        const actualBranchId = branchIdMap.get(i + 1) || branches[0].id;

        await Zone.create({
          zoneTitle: zoneData.zoneTitle,
          zoneNumber: zoneData.zoneNumber,
          zoneDescription: zoneData.zoneDescription,
          branchId: actualBranchId,
          isActive: zoneData.isActive,
        });

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating zone:`, error.message);
      }
    }

    // Add zones specifically for Salt Branch if it exists
    if (saltBranch) {
      for (const zoneData of SALT_BRANCH_ZONES) {
        try {
          await Zone.create({
            zoneTitle: zoneData.zoneTitle,
            zoneNumber: zoneData.zoneNumber,
            zoneDescription: zoneData.zoneDescription,
            branchId: saltBranch.id,
            isActive: zoneData.isActive,
          });

          createdCount++;
          console.log(`   ✅ Created zone "${zoneData.zoneTitle}" for Salt Branch`);
        } catch (error: any) {
          console.error(`   ⚠️  Error creating zone for Salt Branch:`, error.message);
        }
      }
    } else {
      console.log('   ⚠️  Salt Branch not found. Skipping Salt Branch zones.');
    }

    console.log(`   ✅ Seeded ${createdCount} zones`);
  } catch (error: any) {
    console.error('   ❌ Error seeding zones:', error.message);
    throw error;
  }
};

/**
 * Seed maintenance services table
 */
export const seedMaintenanceServices = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding maintenance services...');

    const companies = await Company.findAll();
    if (companies.length === 0) {
      throw new Error('No companies found. Please seed companies first.');
    }

    const mainServices = await Lookup.findAll({
      where: { category: LookupCategory.MAIN_SERVICE, isActive: true },
    });
    const subServices = await Lookup.findAll({
      where: { category: LookupCategory.SUB_SERVICE, isActive: true },
    });

    if (mainServices.length === 0 || subServices.length === 0) {
      throw new Error('No main/sub services found. Please seed lookups first.');
    }

    const existingServices = await MaintenanceService.count();
    if (existingServices > 0 && !force) {
      console.log(`   Found ${existingServices} existing maintenance services. Skipping seed.`);
      return;
    }

    if (force) {
      await MaintenanceService.destroy({ where: {}, force: true });
      console.log('   Cleared existing maintenance services.');
    }

    let createdCount = 0;
    for (const serviceData of MAINTENANCE_SERVICES_DATA) {
      try {
        const company = companies.find(c => c.id === serviceData.itemId) || companies[0];
        const mainService = mainServices.find(s => s.id === serviceData.mainServiceId) || mainServices[0];
        const subService = subServices.find(s => s.id === serviceData.subServiceId) || subServices[0];

        await MaintenanceService.create({
          itemId: company.id,
          itemType: 'company',
          mainServiceId: mainService.id,
          subServiceId: subService.id,
          isActive: serviceData.isActive,
        });

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating maintenance service:`, error.message);
      }
    }

    console.log(`   ✅ Seeded ${createdCount} maintenance services`);
  } catch (error: any) {
    console.error('   ❌ Error seeding maintenance services:', error.message);
    throw error;
  }
};

/**
 * Seed tickets table
 */
export const seedTickets = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding tickets...');

    const companies = await Company.findAll();
    const contracts = await Contract.findAll();
    const branches = await Branch.findAll();
    const zones = await Zone.findAll();

    if (companies.length === 0 || contracts.length === 0 || branches.length === 0 || zones.length === 0) {
      throw new Error('Missing required data. Please seed companies, contracts, branches, and zones first.');
    }

    const ticketCodes = await Lookup.findAll({
      where: { category: LookupCategory.TICKET_CODE, isActive: true },
    });
    const ticketTypes = await Lookup.findAll({
      where: { category: LookupCategory.TICKET_TYPE, isActive: true },
    });
    const ticketStatuses = await Lookup.findAll({
      where: { category: LookupCategory.TICKET_STATUS, isActive: true },
    });
    // Team Leaders and Technicians are now users, not lookups
    // Fetch users with role IDs 20 (Team Leader) and 21 (Technician) instead
    const teamLeaders = await User.findAll({
      where: { userRoleId: 20, isActive: true, isDeleted: false },
      order: [['id', 'ASC']],
    });
    const technicians = await User.findAll({
      where: { userRoleId: 21, isActive: true, isDeleted: false },
      order: [['id', 'ASC']],
    });
    const mainServices = await Lookup.findAll({
      where: { category: LookupCategory.MAIN_SERVICE, isActive: true },
    });

    if (ticketCodes.length === 0 || ticketTypes.length === 0) {
      throw new Error('Missing ticket lookups. Please seed ticket lookups first.');
    }

    if (teamLeaders.length === 0) {
      throw new Error('No team leaders found. Please seed users with team leader role (role ID 20) first.');
    }

    if (technicians.length === 0) {
      throw new Error('No technicians found. Please seed users with technician role (role ID 21) first.');
    }

    const existingTickets = await Ticket.count();
    if (existingTickets > 0 && !force) {
      console.log(`   Found ${existingTickets} existing tickets. Skipping seed.`);
      return;
    }

    if (force) {
      await Ticket.destroy({ where: {}, force: true });
      console.log('   Cleared existing tickets.');
    }

    let createdCount = 0;
    for (let i = 0; i < TICKETS_DATA.length; i++) {
      const ticketData = TICKETS_DATA[i];

      try {
        const company = companies[i % companies.length];
        const contract = contracts[i % contracts.length];
        const branch = branches[i % branches.length];
        const zone = zones[i % zones.length];
        const ticketType = ticketTypes[i % ticketTypes.length];
        const ticketStatus = ticketStatuses[i % ticketStatuses.length];
        const teamLeader = teamLeaders[i % teamLeaders.length];
        const technician = technicians[i % technicians.length];
        const mainService = mainServices[i % mainServices.length] || mainServices[0];

        if (!teamLeader) {
          throw new Error(`No team leader available for ticket ${i + 1}`);
        }

        if (!technician) {
          throw new Error(`No technician available for ticket ${i + 1}`);
        }

        // Create ticket first (we need the ticket ID to generate the code)
        const ticket = await Ticket.create({
          ticketCodeId: 'TEMP', // Temporary value, will be updated after creation
          companyId: company.id,
          contractId: contract.id,
          branchId: branch.id,
          zoneId: zone.id,
          locationMap: ticketData.locationMap,
          ticketTitle: ticketData.ticketTitle,
          ticketTypeId: ticketType.id,
          ticketStatusId: ticketStatus.id,
          ticketDate: ticketData.ticketDate,
          ticketTimeFrom: ticketData.ticketTimeFrom,
          ticketTimeTo: ticketData.ticketTimeTo,
          assignToTeamLeaderId: teamLeader.id,
          assignToTechnicianId: technician.id,
          ticketDescription: ticketData.ticketDescription,
          havingFemaleEngineer: ticketData.havingFemaleEngineer,
          mainServiceId: mainService.id,
          serviceDescription: ticketData.serviceDescription,
          tools: ticketData.tools,
        });

        // Generate ticket code (format: {COMPANY_NAME}-TKT-{TICKET_ID})
        // Extract company name from title and convert to uppercase (e.g., "gamma solutions" -> "GAMMA")
        const companyName = company.title.toUpperCase().split(' ')[0]; // Take first word and uppercase
        const ticketCodeId = `${companyName}-TKT-${ticket.id}`;
        
        // Update ticket with the generated code
        await ticket.update({ ticketCodeId });

        createdCount++;
      } catch (error: any) {
        console.error(`   ⚠️  Error creating ticket:`, error.message);
      }
    }

    console.log(`   ✅ Seeded ${createdCount} tickets`);
  } catch (error: any) {
    console.error('   ❌ Error seeding tickets:', error.message);
    throw error;
  }
};

/**
 * Seed additional lookup data (business models, managed by, main/sub services, ticket lookups, tools)
 */
export const seedAdditionalLookups = async (force: boolean = false): Promise<void> => {
  try {
    console.log('\n🌱 Seeding additional lookups...');

    // Seed business models and managed by
    const existingBusinessModels = await Lookup.count({
      where: { category: LookupCategory.BUSINESS_MODEL },
    });
    const existingManagedBy = await Lookup.count({
      where: { category: LookupCategory.MANAGED_BY },
    });

    if (existingBusinessModels === 0 || force) {
      if (force) {
        await Lookup.destroy({ where: { category: LookupCategory.BUSINESS_MODEL }, force: true });
      }
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const model of BUSINESS_MODELS) {
        try {
          const existing = await Lookup.findByPk(model.id);
          if (existing) {
            if (force) {
              await existing.update(model as any);
              createdCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          await Lookup.create(model as any);
          createdCount++;
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.parent && error.parent.code === '23505')) {
            skippedCount++;
            continue;
          }
          console.error(`   ⚠️  Error creating business model ${model.id}:`, error.message);
        }
      }
      console.log(`   ✅ Seeded business models: ${createdCount} created, ${skippedCount} skipped`);
    }

    if (existingManagedBy === 0 || force) {
      if (force) {
        await Lookup.destroy({ where: { category: LookupCategory.MANAGED_BY }, force: true });
      }
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const item of MANAGED_BY) {
        try {
          const existing = await Lookup.findByPk(item.id);
          if (existing) {
            if (force) {
              await existing.update(item as any);
              createdCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          await Lookup.create(item as any);
          createdCount++;
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.parent && error.parent.code === '23505')) {
            skippedCount++;
            continue;
          }
          console.error(`   ⚠️  Error creating managed by ${item.id}:`, error.message);
        }
      }
      console.log(`   ✅ Seeded managed by items: ${createdCount} created, ${skippedCount} skipped`);
    }

    // Seed main services and sub services
    const existingMainServices = await Lookup.count({
      where: { category: LookupCategory.MAIN_SERVICE },
    });
    const existingSubServices = await Lookup.count({
      where: { category: LookupCategory.SUB_SERVICE },
    });

    if (existingMainServices === 0 || force) {
      if (force) {
        await Lookup.destroy({ where: { category: LookupCategory.MAIN_SERVICE }, force: true });
      }
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const service of MAIN_SERVICES_DATA) {
        try {
          const existing = await Lookup.findByPk(service.id);
          if (existing) {
            if (force) {
              await existing.update(service as any);
              createdCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          await Lookup.create(service as any);
          createdCount++;
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.parent && error.parent.code === '23505')) {
            skippedCount++;
            continue;
          }
          console.error(`   ⚠️  Error creating main service ${service.id}:`, error.message);
        }
      }
      console.log(`   ✅ Seeded main services: ${createdCount} created, ${skippedCount} skipped`);
    }

    if (existingSubServices === 0 || force) {
      if (force) {
        await Lookup.destroy({ where: { category: LookupCategory.SUB_SERVICE }, force: true });
      }
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const service of SUB_SERVICES_DATA) {
        try {
          const existing = await Lookup.findByPk(service.id);
          if (existing) {
            if (force) {
              await existing.update(service as any);
              createdCount++;
            } else {
              skippedCount++;
            }
            continue;
          }
          await Lookup.create(service as any);
          createdCount++;
        } catch (error: any) {
          if (error.name === 'SequelizeUniqueConstraintError' || 
              (error.parent && error.parent.code === '23505')) {
            skippedCount++;
            continue;
          }
          console.error(`   ⚠️  Error creating sub service ${service.id}:`, error.message);
        }
      }
      console.log(`   ✅ Seeded sub services: ${createdCount} created, ${skippedCount} skipped`);
    }

    // Seed ticket lookups and tools
    // First, ensure all enum values exist
    try {
      const queryInterface = (Lookup.sequelize as any).getQueryInterface();
      const enumValues = [
        'TicketCode', 
        'TicketType', 
        'TicketStatus',
        'Tool',
        'Technician',
        'TeamLeader',
      ];
      
      for (const value of enumValues) {
        try {
          await queryInterface.sequelize.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = '${value}' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_lookups_category')
              ) THEN
                ALTER TYPE enum_lookups_category ADD VALUE '${value}';
              END IF;
            END $$;
          `);
        } catch (error: any) {
          // Ignore if already exists
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            console.log(`   ⚠️  Could not add ${value} to enum:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.log('   ⚠️  Could not ensure enum values exist:', error.message);
    }

    // Ticket lookups (codes, types, statuses, times, response times) are now included in LOOKUP_DATA
    // and are seeded by seedLookups() function

    // Seed tools
    let existingTools = 0;
    try {
      existingTools = await Lookup.count({
        where: { category: LookupCategory.TOOL },
      });
    } catch (error: any) {
      console.log('   ⚠️  Could not count existing tools:', error.message);
      // If enum value doesn't exist, skip tools seeding
      if (error.message.includes('invalid input value for enum')) {
        console.log('   ⚠️  Tool enum value not available, skipping tools seeding');
      } else {
        throw error;
      }
    }

    if (existingTools === 0 || force) {
      if (force) {
        try {
          await Lookup.destroy({ where: { category: LookupCategory.TOOL }, force: true });
        } catch (error: any) {
          console.log('   ⚠️  Could not destroy existing tools:', error.message);
        }
      }
      try {
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        
        for (const tool of TOOLS) {
          try {
            // Check if tool with this ID already exists
            const existing = await Lookup.findByPk(tool.id);
            if (existing) {
              if (force) {
                // Update existing tool
                await existing.update({
                  category: tool.category,
                  code: tool.code,
                  description: tool.description,
                  isActive: tool.isActive,
                  isDefault: tool.isDefault,
                  name: tool.name,
                  nameArabic: tool.nameArabic,
                  orderId: tool.orderId,
                  parentLookupId: tool.parentLookupId,
                });
                updatedCount++;
              } else {
                skippedCount++;
              }
              continue;
            }

            // Create new tool
            await Lookup.create(tool as any);
            createdCount++;
          } catch (error: any) {
            // Handle duplicate key errors gracefully
            if (error.name === 'SequelizeUniqueConstraintError' || 
                (error.parent && error.parent.code === '23505')) {
              skippedCount++;
              continue;
            }
            console.error(`   ⚠️  Error creating tool ${tool.id} (${tool.name}):`, error.message);
          }
        }
        
        console.log(`   ✅ Seeded tools: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`);
      } catch (error: any) {
        console.log('   ⚠️  Could not seed tools:', error.message);
      }
    }
  } catch (error: any) {
    console.error('   ❌ Error seeding additional lookups:', error.message);
    throw error;
  }
};

/**
 * Seed new states for countries that don't have states yet
 * Only inserts new states (IDs 40-63) without deleting existing ones
 */
export const seedNewStates = async (): Promise<void> => {
  try {
    console.log('\n🌱 Seeding new states for countries...\n');

    // Filter only new states (IDs 40-63)
    const newStates = STATES.filter(state => state.id >= 40 && state.id <= 63);

    console.log(`📊 Found ${newStates.length} new states to seed\n`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const stateData of newStates) {
      try {
        // Check if state already exists
        const existing = await Lookup.findByPk(stateData.id);
        
        if (existing) {
          // Update existing state
          await existing.update({
            category: stateData.category,
            code: stateData.code,
            description: stateData.description,
            isActive: stateData.isActive,
            isDefault: stateData.isDefault,
            name: stateData.name,
            nameArabic: stateData.nameArabic,
            orderId: stateData.orderId,
            parentLookupId: stateData.parentLookupId,
          });
          console.log(`   ✅ Updated state "${stateData.name}" (ID: ${stateData.id})`);
          updatedCount++;
        } else {
          // Create new state
          await Lookup.create({
            category: stateData.category,
            code: stateData.code,
            description: stateData.description,
            id: stateData.id,
            isActive: stateData.isActive,
            isDefault: stateData.isDefault,
            name: stateData.name,
            nameArabic: stateData.nameArabic,
            orderId: stateData.orderId,
            parentLookupId: stateData.parentLookupId,
          });
          console.log(`   ✅ Created state "${stateData.name}" (ID: ${stateData.id})`);
          createdCount++;
        }
      } catch (error: any) {
        // Handle duplicate key errors gracefully
        if (error.name === 'SequelizeUniqueConstraintError' || 
            (error.parent && error.parent.code === '23505')) {
          skippedCount++;
          continue;
        }
        console.error(`   ⚠️  Error processing state ${stateData.id} (${stateData.name}):`, error.message);
      }
    }

    console.log(`\n✅ New states seeding completed!`);
    console.log(`   📈 Created: ${createdCount} states`);
    console.log(`   🔄 Updated: ${updatedCount} states`);
    console.log(`   ⏭️  Skipped: ${skippedCount} states\n`);
  } catch (error: any) {
    console.error('   ❌ Error seeding new states:', error.message);
    throw error;
  }
};
