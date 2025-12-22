export interface TicketData {
  ticketCodeId: number;
  companyId: number;
  contractId: number;
  branchId: number;
  zoneId: number;
  locationMap: string;
  locationDescription: string;
  ticketTypeId: number;
  ticketStatusId: number;
  ticketDate: string;
  ticketTimeFrom: string; // Start time in HH:MM:SS format (allowed: 08:00:00, 10:00:00, 12:00:00, 14:00:00, 16:00:00, 18:00:00)
  ticketTimeTo: string; // End time in HH:MM:SS format (always 2 hours after ticketTimeFrom)
  assignToTeamLeaderId: number;
  assignToTechnicianId: number;
  ticketDescription: string;
  havingFemaleEngineer: boolean;
  mainServiceId: number;
  serviceDescription: string;
  tools: number[] | null;
}

// Helper function to generate random date in 2025 (Gregorian calendar)
const getRandomDate = (): string => {
  // Generate dates throughout 2025 (January 1 to December 31, 2025)
  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');
  
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  const randomDate = new Date(randomTime);
  
  const year = randomDate.getFullYear();
  const month = String(randomDate.getMonth() + 1).padStart(2, '0');
  const day = String(randomDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Helper function to generate random time from allowed hours (08, 10, 12, 14, 16, 18)
const getRandomTimeFrom = (): string => {
  const allowedHours = ['08', '10', '12', '14', '16', '18'];
  const randomHour = allowedHours[Math.floor(Math.random() * allowedHours.length)];
  return `${randomHour}:00:00`;
};

// Helper function to calculate end time (always 2 hours after start time)
const getRandomTimeTo = (timeFrom: string): string => {
  const [hours] = timeFrom.split(':').map(Number);
  const endHour = hours + 2;
  return `${String(endHour).padStart(2, '0')}:00:00`;
};

// Helper function to generate random location coordinates (Jordan area)
const getRandomLocation = (): string => {
  const lat = (31.5 + Math.random() * 1.5).toFixed(4); // 31.5 to 33.0
  const lng = (35.5 + Math.random() * 1.5).toFixed(4); // 35.5 to 37.0
  return `https://maps.google.com/?q=${lat},${lng}`;
};

// Helper function to generate random location description
const getRandomLocationDescription = (): string => {
  const buildings = ['Building A', 'Building B', 'Building C', 'Office Building', 'Warehouse', 'Factory', 'Residential Complex', 'Commercial Center', 'Industrial Zone', 'Campus Area'];
  const floors = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5', 'Basement', 'Parking Level'];
  const rooms = ['Room 101', 'Room 202', 'Room 303', 'Main Hall', 'Conference Room', 'Lobby', 'Section A', 'Section B', 'Wing East', 'Wing West'];
  
  const building = buildings[Math.floor(Math.random() * buildings.length)];
  const floor = floors[Math.floor(Math.random() * floors.length)];
  const room = rooms[Math.floor(Math.random() * rooms.length)];
  
  return `${building}, ${floor}, ${room}`;
};

// Helper function to generate random ticket description
const getRandomTicketDescription = (ticketType: string, mainService: string): string => {
  const descriptions: Record<string, string[]> = {
    'Electrical': [
      'Electrical system inspection and maintenance',
      'Power outage investigation and repair',
      'Circuit breaker replacement',
      'Wiring inspection and upgrade',
      'Lighting fixture installation',
      'Electrical panel maintenance',
      'Outlet and switch repair',
      'Emergency electrical repair',
    ],
    'Plumbing': [
      'Water leak detection and repair',
      'Pipe replacement and maintenance',
      'Toilet and bathroom fixture repair',
      'Water pressure adjustment',
      'Drain cleaning and unclogging',
      'Water heater maintenance',
      'Plumbing system inspection',
      'Emergency plumbing repair',
    ],
    'HVAC': [
      'AC unit maintenance and cleaning',
      'HVAC system inspection',
      'Thermostat calibration',
      'Air filter replacement',
      'Refrigerant level check',
      'Duct cleaning and repair',
      'Heating system maintenance',
      'Emergency HVAC repair',
    ],
  };
  
  const serviceType = mainService.includes('Electrical') ? 'Electrical' : 
                      mainService.includes('Plumbing') ? 'Plumbing' : 'HVAC';
  const options = descriptions[serviceType] || descriptions.Electrical;
  return options[Math.floor(Math.random() * options.length)];
};

// Generate 200 tickets
const generateTickets = (): TicketData[] => {
  const tickets: TicketData[] = [];
  const ticketTypes = [203, 204]; // Corrective, Emergency (Preventive removed)
  const ticketStatuses = [109, 110, 111, 112]; // Pending, In Progress, Completed, Cancelled
  const mainServices = [18, 19, 20]; // Electrical, Plumbing, HVAC
  const toolsSets = [
    [117, 118, 119], // Electrical tools
    [120, 121, 122], // Plumbing tools
    [123, 124, 125], // HVAC tools
    [117, 118], // Basic electrical
    [120, 121], // Basic plumbing
    [123, 124], // Basic HVAC
    null, // No tools
  ];
  
  const serviceNames = ['Electrical Service', 'Plumbing Service', 'HVAC Service'];
  
  for (let i = 0; i < 200; i++) {
    const companyIndex = (i % 10) + 1; // Cycle through companies 1-10
    const ticketType = ticketTypes[i % ticketTypes.length];
    const ticketStatus = ticketStatuses[i % ticketStatuses.length];
    const mainService = mainServices[i % mainServices.length];
    const serviceName = serviceNames[i % serviceNames.length];
    const ticketTimeFrom = getRandomTimeFrom();
    const ticketTimeTo = getRandomTimeTo(ticketTimeFrom);
    
    tickets.push({
      ticketCodeId: 200 + (i % 2), // Alternate between ticket codes
      companyId: companyIndex,
      contractId: companyIndex,
      branchId: companyIndex,
      zoneId: (i % 5) + 1, // Cycle through zones 1-5
      locationMap: getRandomLocation(),
      locationDescription: getRandomLocationDescription(),
      ticketTypeId: ticketType,
      ticketStatusId: ticketStatus,
      ticketDate: getRandomDate(),
      ticketTimeFrom,
      ticketTimeTo,
      assignToTeamLeaderId: 113 + (i % 2), // Alternate team leaders
      assignToTechnicianId: 115 + (i % 2), // Alternate technicians
      ticketDescription: getRandomTicketDescription('', serviceName),
      havingFemaleEngineer: i % 3 === 0, // 33% chance
      mainServiceId: mainService,
      serviceDescription: getRandomTicketDescription('', serviceName),
      tools: toolsSets[i % toolsSets.length],
    });
  }
  
  return tickets;
};

export const TICKETS_DATA: readonly TicketData[] = generateTickets();


