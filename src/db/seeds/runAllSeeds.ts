import 'reflect-metadata';
import {
  assignTeamLeadersAndTechniciansToCompanies,
  seedAdditionalLookups,
  seedBranches,
  seedCompanies,
  seedContracts,
  seedLookups,
  seedMaintenanceServices,
  seedNewStates,
  seedTickets,
  seedUsers,
  seedZones,
} from './seedFunctions';
import { addSaltBranchZones } from './addSaltBranchZones';

import { orm } from '../orm';

interface SeedOptions {
  force?: boolean;
  skip?: string[];
}

/**
 * Run all seeds in the correct dependency order
 */
export const runAllSeeds = async (options: SeedOptions = {}): Promise<void> => {
  const { force = false, skip = [] } = options;

  try {
    console.log('\n🚀 Starting database seeding...\n');
    console.log(`   Force mode: ${force ? 'ON' : 'OFF'}`);
    if (skip.length > 0) {
      console.log(`   Skipping: ${skip.join(', ')}`);
    }
    console.log('');

    // Ensure database connection
    await orm.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check if lookups table exists (required for seeding)
    const queryInterface = orm.sequelize.getQueryInterface();
    let lookupsTableExists = false;
    try {
      await queryInterface.describeTable('lookups');
      lookupsTableExists = true;
    } catch {
      lookupsTableExists = false;
    }

    if (!lookupsTableExists) {
      console.error('\n❌ Error: The "lookups" table does not exist in the database.');
      console.error('   Please run database migrations first before seeding.');
      console.error('   Run: npm run migrate:up\n');
      throw new Error('Database tables do not exist. Please run migrations first.');
    }

    // Seed in dependency order
    if (!skip.includes('lookups')) {
      await seedLookups(force);
    }

    if (!skip.includes('newStates')) {
      await seedNewStates();
    }

    if (!skip.includes('additionalLookups')) {
      await seedAdditionalLookups(force);
    }

    // Seed companies BEFORE users (users need companies to exist)
    if (!skip.includes('companies')) {
      await seedCompanies(force);
    }

    if (!skip.includes('users')) {
      await seedUsers(force);
    }

    // Assign team leaders and technicians to companies (3 per company)
    // This must run after companies are seeded (users may already exist)
    // Always try to assign, even if users/companies were skipped (they might already exist)
    await assignTeamLeadersAndTechniciansToCompanies();

    if (!skip.includes('contracts')) {
      await seedContracts(force);
    }

    if (!skip.includes('branches')) {
      await seedBranches(force);
    }

    if (!skip.includes('zones')) {
      await seedZones(force);
      // Add zones specifically for Salt Branch
      await addSaltBranchZones();
    }

    if (!skip.includes('maintenanceServices')) {
      await seedMaintenanceServices(force);
    }

    if (!skip.includes('tickets')) {
      await seedTickets(force);
    }

    console.log('\n✅ All seeds completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error);
    throw error;
  } finally {
    await orm.sequelize.close();
  }
};

/**
 * Run a specific seed by name
 */
export const runSeed = async (seedName: string, force: boolean = false): Promise<void> => {
  try {
    console.log(`\n🚀 Running seed: ${seedName}\n`);

    await orm.sequelize.authenticate();
    console.log('✅ Database connection established\n');

    switch (seedName) {
      case 'lookups':
        await seedLookups(force);
        break;
      case 'newStates':
        await seedNewStates();
        break;
      case 'additionalLookups':
        await seedAdditionalLookups(force);
        break;
      case 'users':
        await seedUsers(force);
        break;
      case 'companies':
        await seedCompanies(force);
        break;
      case 'contracts':
        await seedContracts(force);
        break;
      case 'branches':
        await seedBranches(force);
        break;
      case 'zones':
        await seedZones(force);
        await addSaltBranchZones();
        break;
      case 'saltBranchZones':
        await addSaltBranchZones();
        break;
      case 'maintenanceServices':
        await seedMaintenanceServices(force);
        break;
      case 'tickets':
        await seedTickets(force);
        break;
      default:
        throw new Error(`Unknown seed name: ${seedName}`);
    }

    console.log(`\n✅ Seed '${seedName}' completed successfully!\n`);
  } catch (error: any) {
    console.error(`\n❌ Error running seed '${seedName}':`, error);
    throw error;
  } finally {
    await orm.sequelize.close();
  }
};

// If run directly, execute all seeds
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');
  const seedName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (seedName) {
    runSeed(seedName, force).catch(error => {
      console.error(error);
      process.exit(1);
    });
  } else {
    runAllSeeds({ force }).catch(error => {
      console.error(error);
      process.exit(1);
    });
  }
}

