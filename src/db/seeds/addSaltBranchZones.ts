/**
 * Script to add zones to Salt Branch for admin@gamma.com
 * Run this script to add zones directly to the database
 */

import { Branch } from '../models/branch.model';
import { Zone } from '../models/zone.model';
import { SALT_BRANCH_ZONES } from './zonesSeed';

export const addSaltBranchZones = async (): Promise<void> => {
  try {
    console.log('\n🌱 Adding zones to Salt Branch...');

    // Find Salt Branch
    const saltBranch = await Branch.findOne({
      where: {
        branchTitle: 'Salt Branch',
        // Or use branchNameEnglish: 'Salt Branch'
      },
    });

    if (!saltBranch) {
      console.log('   ⚠️  Salt Branch not found. Please seed branches first.');
      return;
    }

    console.log(`   ✅ Found Salt Branch (ID: ${saltBranch.id})`);

    // Check if zones already exist for Salt Branch
    const existingZones = await Zone.findAll({
      where: {
        branchId: saltBranch.id,
      },
    });

    // Filter out zones that already exist
    const zonesToCreate = SALT_BRANCH_ZONES.filter(
      (zoneData) => !existingZones.some((existing) => existing.zoneNumber === zoneData.zoneNumber)
    );

    if (zonesToCreate.length === 0) {
      console.log('   ℹ️  All zones for Salt Branch already exist.');
      return;
    }

    let createdCount = 0;
    for (const zoneData of zonesToCreate) {
      try {
        await Zone.create({
          zoneTitle: zoneData.zoneTitle,
          zoneNumber: zoneData.zoneNumber,
          zoneDescription: zoneData.zoneDescription,
          branchId: saltBranch.id,
          isActive: zoneData.isActive,
        });

        createdCount++;
        console.log(`   ✅ Created zone: ${zoneData.zoneTitle} (${zoneData.zoneNumber})`);
      } catch (error: any) {
        console.error(`   ⚠️  Error creating zone "${zoneData.zoneTitle}":`, error.message);
      }
    }

    console.log(`   ✅ Added ${createdCount} zones to Salt Branch`);
  } catch (error: any) {
    console.error('   ❌ Error adding zones to Salt Branch:', error.message);
    throw error;
  }
};

