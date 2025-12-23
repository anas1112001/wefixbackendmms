import { LookupCategory } from '../models/lookup.model';

export interface MainServiceData {
  id: number;
  category: LookupCategory;
  name: string;
  nameArabic: string | null;
  code: string | null;
  description: string | null;
  icon: string | null;
  orderId: number;
  isDefault: boolean;
  isActive: boolean;
  parentLookupId: number | null;
}

export const MAIN_SERVICES_DATA: readonly MainServiceData[] = [
  {
    id: 86,
    category: LookupCategory.MAIN_SERVICE,
    name: 'Electrical',
    nameArabic: 'كهرباء',
    code: 'ELEC',
    description: 'Electrical services including installation, repair, and maintenance',
    icon: '/WeFixFiles/Icons/electrical.png',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
  {
    id: 87,
    category: LookupCategory.MAIN_SERVICE,
    name: 'Plumbing',
    nameArabic: 'سباكة',
    code: 'PLUMB',
    description: 'Plumbing services including installation and repair',
    icon: '/WeFixFiles/Icons/plumbing.png',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
  {
    id: 88,
    category: LookupCategory.MAIN_SERVICE,
    name: 'HVAC',
    nameArabic: 'تكييف وتدفئة',
    code: 'HVAC',
    description: 'Heating, Ventilation, and Air Conditioning services',
    icon: '/WeFixFiles/Icons/hvac.png',
    orderId: 3,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
  {
    id: 89,
    category: LookupCategory.MAIN_SERVICE,
    name: 'Elevator',
    nameArabic: 'مصاعد',
    code: 'ELEV',
    description: 'Elevator maintenance and repair services',
    icon: '/WeFixFiles/Icons/elevator.png',
    orderId: 4,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
  {
    id: 90,
    category: LookupCategory.MAIN_SERVICE,
    name: 'Carpentry',
    nameArabic: 'نجارة',
    code: 'CARP',
    description: 'Carpentry and woodwork services',
    icon: '/WeFixFiles/Icons/carpentry.png',
    orderId: 5,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
  {
    id: 91,
    category: LookupCategory.MAIN_SERVICE,
    name: 'Painting',
    nameArabic: 'دهان',
    code: 'PAINT',
    description: 'Painting and finishing services',
    icon: '/WeFixFiles/Icons/painting.png',
    orderId: 6,
    isDefault: false,
    isActive: true,
    parentLookupId: null,
  },
];

export const SUB_SERVICES_DATA: readonly MainServiceData[] = [
  // Electrical Sub Services
  {
    id: 92,
    category: LookupCategory.SUB_SERVICE,
    name: 'Installation',
    nameArabic: 'تركيب',
    code: 'ELEC-INSTALL',
    description: 'Electrical installation services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 86, // Electrical
  },
  {
    id: 93,
    category: LookupCategory.SUB_SERVICE,
    name: 'Repair',
    nameArabic: 'إصلاح',
    code: 'ELEC-REPAIR',
    description: 'Electrical repair services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 86, // Electrical
  },
  {
    id: 94,
    category: LookupCategory.SUB_SERVICE,
    name: 'Maintenance',
    nameArabic: 'صيانة',
    code: 'ELEC-MAINT',
    description: 'Electrical maintenance services',
    orderId: 3,
    isDefault: false,
    isActive: true,
    parentLookupId: 86, // Electrical
  },
  
  // Plumbing Sub Services
  {
    id: 95,
    category: LookupCategory.SUB_SERVICE,
    name: 'Installation',
    nameArabic: 'تركيب',
    code: 'PLUMB-INSTALL',
    description: 'Plumbing installation services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 87, // Plumbing
  },
  {
    id: 96,
    category: LookupCategory.SUB_SERVICE,
    name: 'Repair',
    nameArabic: 'إصلاح',
    code: 'PLUMB-REPAIR',
    description: 'Plumbing repair services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 87, // Plumbing
  },
  {
    id: 97,
    category: LookupCategory.SUB_SERVICE,
    name: 'Maintenance',
    nameArabic: 'صيانة',
    code: 'PLUMB-MAINT',
    description: 'Plumbing maintenance services',
    orderId: 3,
    isDefault: false,
    isActive: true,
    parentLookupId: 87, // Plumbing
  },
  
  // HVAC Sub Services
  {
    id: 98,
    category: LookupCategory.SUB_SERVICE,
    name: 'Installation',
    nameArabic: 'تركيب',
    code: 'HVAC-INSTALL',
    description: 'HVAC installation services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 88, // HVAC
  },
  {
    id: 99,
    category: LookupCategory.SUB_SERVICE,
    name: 'Repair',
    nameArabic: 'إصلاح',
    code: 'HVAC-REPAIR',
    description: 'HVAC repair services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 88, // HVAC
  },
  {
    id: 100,
    category: LookupCategory.SUB_SERVICE,
    name: 'Maintenance',
    nameArabic: 'صيانة',
    code: 'HVAC-MAINT',
    description: 'HVAC maintenance services',
    orderId: 3,
    isDefault: false,
    isActive: true,
    parentLookupId: 88, // HVAC
  },
  
  // Elevator Sub Services
  {
    id: 101,
    category: LookupCategory.SUB_SERVICE,
    name: 'Maintenance',
    nameArabic: 'صيانة',
    code: 'ELEV-MAINT',
    description: 'Elevator maintenance services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 89, // Elevator
  },
  {
    id: 102,
    category: LookupCategory.SUB_SERVICE,
    name: 'Repair',
    nameArabic: 'إصلاح',
    code: 'ELEV-REPAIR',
    description: 'Elevator repair services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 89, // Elevator
  },
  
  // Carpentry Sub Services
  {
    id: 103,
    category: LookupCategory.SUB_SERVICE,
    name: 'Installation',
    nameArabic: 'تركيب',
    code: 'CARP-INSTALL',
    description: 'Carpentry installation services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 90, // Carpentry
  },
  {
    id: 104,
    category: LookupCategory.SUB_SERVICE,
    name: 'Repair',
    nameArabic: 'إصلاح',
    code: 'CARP-REPAIR',
    description: 'Carpentry repair services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 90, // Carpentry
  },
  
  // Painting Sub Services
  {
    id: 105,
    category: LookupCategory.SUB_SERVICE,
    name: 'Interior',
    nameArabic: 'داخلي',
    code: 'PAINT-INT',
    description: 'Interior painting services',
    orderId: 1,
    isDefault: false,
    isActive: true,
    parentLookupId: 91, // Painting
  },
  {
    id: 106,
    category: LookupCategory.SUB_SERVICE,
    name: 'Exterior',
    nameArabic: 'خارجي',
    code: 'PAINT-EXT',
    description: 'Exterior painting services',
    orderId: 2,
    isDefault: false,
    isActive: true,
    parentLookupId: 91, // Painting
  },
];


