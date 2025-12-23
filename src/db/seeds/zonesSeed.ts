export interface ZoneSeedData {
  zoneTitle: string;
  zoneNumber: string | null;
  zoneDescription: string | null;
  branchId: string; // Will be set dynamically from existing branches
  isActive: boolean;
}

export const ZONES_DATA: readonly Omit<ZoneSeedData, 'branchId'>[] = [
  {
    zoneTitle: 'Zone 1 - Downtown Area',
    zoneNumber: 'Z001',
    zoneDescription: 'Downtown commercial and residential area',
    isActive: true,
  },
  {
    zoneTitle: 'Zone 2 - Industrial District',
    zoneNumber: 'Z002',
    zoneDescription: 'Industrial and manufacturing district',
    isActive: true,
  },
  {
    zoneTitle: 'Zone 3 - Residential Complex',
    zoneNumber: 'Z003',
    zoneDescription: 'Residential complexes and housing areas',
    isActive: true,
  },
  {
    zoneTitle: 'Zone 4 - Business District',
    zoneNumber: 'Z004',
    zoneDescription: 'Business and financial district',
    isActive: false,
  },
  {
    zoneTitle: 'Zone 5 - University Area',
    zoneNumber: 'Z005',
    zoneDescription: 'University campus and surrounding areas',
    isActive: true,
  },
];

// Zones specifically for Salt Branch (Gamma Solutions)
export const SALT_BRANCH_ZONES: readonly Omit<ZoneSeedData, 'branchId'>[] = [
  {
    zoneTitle: 'Salt Zone 1 - City Center',
    zoneNumber: 'SALT-Z001',
    zoneDescription: 'Salt city center and main commercial area',
    isActive: true,
  },
  {
    zoneTitle: 'Salt Zone 2 - Residential Areas',
    zoneNumber: 'SALT-Z002',
    zoneDescription: 'Residential neighborhoods in Salt',
    isActive: true,
  },
  {
    zoneTitle: 'Salt Zone 3 - Industrial Zone',
    zoneNumber: 'SALT-Z003',
    zoneDescription: 'Industrial and manufacturing areas in Salt',
    isActive: true,
  },
];

