import { Response } from 'express';
import { Ticket } from '../../db/models/ticket.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
import { User } from '../../db/models/user.model';
import { Company } from '../../db/models/company.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';

/**
 * Get tickets for the logged-in company admin's company
 * Filters tickets by companyId and groups by ticket type (Corrective, Preventive, Emergency)
 */
export const getCompanyTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Get companyId from the logged-in user
  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Get ticket type lookups
  const ticketTypes = await Lookup.findAll({
    where: {
      category: LookupCategory.TICKET_TYPE,
      isActive: true,
    },
  });

  // Find type IDs
  const correctiveType = ticketTypes.find(t => t.name.toLowerCase() === 'corrective');
  const preventiveType = ticketTypes.find(t => t.name.toLowerCase() === 'preventive');
  const emergencyType = ticketTypes.find(t => t.name.toLowerCase() === 'emergency');

  // Get pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  const totalCount = await Ticket.count({
    where: {
      companyId: companyId,
      isDeleted: false,
    },
  });

  // Fetch tickets for the company with pagination
  const tickets = await Ticket.findAll({
    where: {
      companyId: companyId,
      isDeleted: false,
    },
    include: [
      {
        model: Lookup,
        as: 'ticketTypeLookup',
        required: false,
      },
      {
        model: Lookup,
        as: 'ticketStatusLookup',
        required: false,
      },
      {
        model: Lookup,
        as: 'mainServiceLookup',
        required: false,
      },
      {
        model: User,
        as: 'assignToTechnicianUser',
        required: false,
        attributes: ['id', 'fullName', 'userNumber'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: limit,
    offset: offset,
  });

  // Group tickets by type
  const correctiveTickets = correctiveType
    ? tickets.filter(t => t.ticketTypeId === correctiveType.id)
    : [];
  const preventiveTickets = preventiveType
    ? tickets.filter(t => t.ticketTypeId === preventiveType.id)
    : [];
  const emergencyTickets = emergencyType
    ? tickets.filter(t => t.ticketTypeId === emergencyType.id)
    : [];

  // Format response
  const response = {
    success: true,
    message: 'Tickets retrieved successfully',
    data: {
      corrective: {
        total: correctiveTickets.length,
        tickets: correctiveTickets.map(formatTicket),
      },
      preventive: {
        total: preventiveTickets.length,
        tickets: preventiveTickets.map(formatTicket),
      },
      emergency: {
        total: emergencyTickets.length,
        tickets: emergencyTickets.map(formatTicket),
      },
      all: {
        total: totalCount,
        tickets: tickets.map(formatTicket),
      },
    },
    pagination: {
      page: page,
      limit: limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: offset + tickets.length < totalCount,
    },
  };

  res.status(200).json(response);
});

/**
 * Get ticket statistics for the company
 */
export const getTicketStatistics = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Get ticket type lookups
  const ticketTypes = await Lookup.findAll({
    where: {
      category: LookupCategory.TICKET_TYPE,
      isActive: true,
    },
  });

  const ticketStatuses = await Lookup.findAll({
    where: {
      category: LookupCategory.TICKET_STATUS,
      isActive: true,
    },
  });

  // Find ticket types by name (case-insensitive) - try multiple approaches
  const correctiveType = ticketTypes.find(t => {
    const name = t.name.toLowerCase().trim();
    return name === 'corrective' || name === 'corrective maintenance' || t.code === 'CORR';
  });
  const preventiveType = ticketTypes.find(t => {
    const name = t.name.toLowerCase().trim();
    return name === 'preventive' || name === 'preventive maintenance' || t.code === 'PREV';
  });
  const emergencyType = ticketTypes.find(t => {
    const name = t.name.toLowerCase().trim();
    return name === 'emergency' || name === 'emergency maintenance' || t.code === 'EMRG';
  });

  // Count tickets by type
  const correctiveCount = correctiveType
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: correctiveType.id,
          isDeleted: false,
        },
      })
    : 0;

  const preventiveCount = preventiveType
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: preventiveType.id,
          isDeleted: false,
        },
      })
    : 0;

  const emergencyCount = emergencyType
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: emergencyType.id,
          isDeleted: false,
        },
      })
    : 0;

  // Get total count for verification
  const totalCount = await Ticket.count({
    where: {
      companyId: companyId,
      isDeleted: false,
    },
  });

  // Find "Completed" status
  const completedStatus = ticketStatuses.find(t => 
    t.name.toLowerCase().trim() === 'completed'
  );

  // Count completed tickets by type
  const correctiveCompleted = correctiveType && completedStatus
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: correctiveType.id,
          ticketStatusId: completedStatus.id,
          isDeleted: false,
        },
      })
    : 0;

  const preventiveCompleted = preventiveType && completedStatus
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: preventiveType.id,
          ticketStatusId: completedStatus.id,
          isDeleted: false,
        },
      })
    : 0;

  const emergencyCompleted = emergencyType && completedStatus
    ? await Ticket.count({
        where: {
          companyId: companyId,
          ticketTypeId: emergencyType.id,
          ticketStatusId: completedStatus.id,
          isDeleted: false,
        },
      })
    : 0;

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const status of ticketStatuses) {
    statusCounts[status.name] = await Ticket.count({
      where: {
        companyId: companyId,
        ticketStatusId: status.id,
        isDeleted: false,
      },
    });
  }

  res.status(200).json({
    success: true,
    message: 'Ticket statistics retrieved successfully',
    data: {
      byType: {
        corrective: {
          total: correctiveCount,
          completed: correctiveCompleted,
        },
        preventive: {
          total: preventiveCount,
          completed: preventiveCompleted,
        },
        emergency: {
          total: emergencyCount,
          completed: emergencyCompleted,
        },
        total: correctiveCount + preventiveCount + emergencyCount,
      },
      byStatus: statusCounts,
    },
  });
});

/**
 * Get ticket details by ID for the logged-in company admin's company
 */
export const getTicketById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const ticketId = parseInt(req.params.id);

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (isNaN(ticketId)) {
    throw new AppError('Invalid ticket ID', 400, 'VALIDATION_ERROR');
  }

  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Fetch ticket with all related data
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId: companyId,
      isDeleted: false,
    },
    include: [
      {
        model: Lookup,
        as: 'ticketTypeLookup',
        required: false,
      },
      {
        model: Lookup,
        as: 'ticketStatusLookup',
        required: false,
      },
      {
        model: Lookup,
        as: 'mainServiceLookup',
        required: false,
      },
      {
        model: Lookup,
        as: 'processLookup',
        required: false,
      },
    ],
  });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404, 'NOT_FOUND');
  }

  // Fetch tool names if tools array exists
  let toolsWithNames: any[] = [];
  if (ticket.tools && ticket.tools.length > 0) {
    const toolLookups = await Lookup.findAll({
      where: {
        id: { [Op.in]: ticket.tools },
        category: LookupCategory.TOOL,
        isActive: true,
      },
    });
    toolsWithNames = toolLookups.map(tool => ({
      id: tool.id,
      title: tool.name,
      titleAr: tool.nameArabic,
    }));
  }

  const ticketData = formatTicket(ticket);
  ticketData.tools = toolsWithNames;

  res.status(200).json({
    success: true,
    message: 'Ticket retrieved successfully',
    data: ticketData,
  });
});

/**
 * Helper function to format ticket for response
 */
function formatTicket(ticket: Ticket): any {
  return {
    id: ticket.id,
    ticketCodeId: ticket.ticketCodeId,
    companyId: ticket.companyId,
    contractId: ticket.contractId,
    branchId: ticket.branchId,
    zoneId: ticket.zoneId,
    locationMap: ticket.locationMap,
    locationDescription: ticket.locationDescription,
    ticketType: ticket.ticketTypeLookup
      ? {
          id: ticket.ticketTypeLookup.id,
          name: ticket.ticketTypeLookup.name,
          nameArabic: ticket.ticketTypeLookup.nameArabic,
        }
      : null,
    ticketStatus: ticket.ticketStatusLookup
      ? {
          id: ticket.ticketStatusLookup.id,
          name: ticket.ticketStatusLookup.name,
          nameArabic: ticket.ticketStatusLookup.nameArabic,
        }
      : null,
    ticketDate: ticket.ticketDate,
    ticketTimeFrom: ticket.ticketTimeFrom,
    ticketTimeTo: ticket.ticketTimeTo,
    ticketDescription: ticket.ticketDescription,
    serviceDescription: ticket.serviceDescription,
    mainService: ticket.mainServiceLookup
      ? {
          id: ticket.mainServiceLookup.id,
          name: ticket.mainServiceLookup.name,
          nameArabic: ticket.mainServiceLookup.nameArabic,
        }
      : null,
    havingFemaleEngineer: ticket.havingFemaleEngineer,
    withMaterial: ticket.withMaterial,
    tools: ticket.tools, // Will be replaced with toolsWithNames in getTicketById
    customerName: ticket.customerName,
    technician: ticket.assignToTechnicianUser
      ? {
          id: ticket.assignToTechnicianUser.id,
          name: ticket.assignToTechnicianUser.fullName,
          userNumber: ticket.assignToTechnicianUser.userNumber,
        }
      : null,
    process: ticket.processLookup
      ? {
          id: ticket.processLookup.id,
          name: ticket.processLookup.name,
          nameArabic: ticket.processLookup.nameArabic,
        }
      : null,
    startTime: ticket.startTime,
    endTime: ticket.endTime,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

/**
 * Create a new ticket
 * Only company admins and team leaders can create tickets
 */
export const createTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Check if user has permission (admin or team leader)
  // Assuming admin role lookup name is 'Admin' and team leader is 'Team Leader'
  // You may need to adjust these based on your actual lookup values
  const userRole = await Lookup.findByPk(user.userRoleId);
  if (!userRole) {
    throw new AppError('User role not found', 404, 'NOT_FOUND');
  }

  const roleName = userRole.name.toLowerCase();
  const isAdmin = roleName.includes('admin');
  const isTeamLeader = roleName.includes('team') && roleName.includes('leader');

  if (!isAdmin && !isTeamLeader) {
    throw new AppError('Only company admins and team leaders can create tickets', 403, 'FORBIDDEN');
  }

  const companyId = user.companyId;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const {
    contractId,
    branchId,
    zoneId,
    locationMap,
    locationDescription,
    ticketTypeId,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription,
    havingFemaleEngineer,
    customerName,
    withMaterial,
    mainServiceId,
    serviceDescription,
    tools,
  } = req.body;

  // Validation
  if (!contractId || !branchId || !zoneId || !locationDescription || !ticketTypeId || 
      !ticketDate || !ticketTimeFrom || !ticketTimeTo || !assignToTeamLeaderId || 
      !assignToTechnicianId || !mainServiceId) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
  }

  // Verify ticket type exists
  const ticketType = await Lookup.findOne({
    where: { id: ticketTypeId, category: LookupCategory.TICKET_TYPE, isActive: true },
  });
  if (!ticketType) {
    throw new AppError('Invalid ticket type', 400, 'VALIDATION_ERROR');
  }

  // Get default status (usually "Pending")
  const defaultStatus = await Lookup.findOne({
    where: { category: LookupCategory.TICKET_STATUS, isDefault: true, isActive: true },
  });
  if (!defaultStatus) {
    throw new AppError('Default ticket status not found', 500, 'INTERNAL_ERROR');
  }

  // Generate ticket code (format: COMPANY-TKT-001)
  // This is a simple implementation - you may want to make this more sophisticated
  const company = await Company.findByPk(companyId);
  const companyShortCode = company?.shortCode || 'COMP';
  const lastTicket = await Ticket.findOne({
    where: { companyId },
    order: [['createdAt', 'DESC']],
  });
  const ticketNumber = lastTicket ? parseInt(lastTicket.ticketCodeId.split('-').pop() || '0') + 1 : 1;
  const ticketCodeId = `${companyShortCode}-TKT-${ticketNumber.toString().padStart(3, '0')}`;

  // Create ticket
  const ticket = await Ticket.create({
    ticketCodeId,
    companyId,
    contractId,
    branchId,
    zoneId,
    locationMap: locationMap || '',
    locationDescription,
    ticketTypeId,
    ticketStatusId: defaultStatus.id,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription: ticketDescription || null,
    havingFemaleEngineer: havingFemaleEngineer || false,
    customerName: customerName || null,
    withMaterial: withMaterial || false,
    mainServiceId,
    serviceDescription: serviceDescription || null,
    tools: tools || null,
    createdBy: user.id,
  });

  // Fetch created ticket with relations
  const createdTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber'] },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: formatTicket(createdTicket!),
  });
});

/**
 * Update an existing ticket
 * Only company admins and team leaders can update tickets
 */
export const updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const ticketId = parseInt(req.params.id);

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (isNaN(ticketId)) {
    throw new AppError('Invalid ticket ID', 400, 'VALIDATION_ERROR');
  }

  // Check if user has permission (admin or team leader)
  const userRole = await Lookup.findByPk(user.userRoleId);
  if (!userRole) {
    throw new AppError('User role not found', 404, 'NOT_FOUND');
  }

  const roleName = userRole.name.toLowerCase();
  const isAdmin = roleName.includes('admin');
  const isTeamLeader = roleName.includes('team') && roleName.includes('leader');

  if (!isAdmin && !isTeamLeader) {
    throw new AppError('Only company admins and team leaders can update tickets', 403, 'FORBIDDEN');
  }

  const companyId = user.companyId;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Find ticket
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId: companyId,
      isDeleted: false,
    },
  });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404, 'NOT_FOUND');
  }

  // Update fields
  const {
    contractId,
    branchId,
    zoneId,
    locationMap,
    locationDescription,
    ticketTypeId,
    ticketStatusId,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription,
    havingFemaleEngineer,
    customerName,
    processId,
    withMaterial,
    mainServiceId,
    serviceDescription,
    tools,
  } = req.body;

  // Validate ticket type if provided
  if (ticketTypeId) {
    const ticketType = await Lookup.findOne({
      where: { id: ticketTypeId, category: LookupCategory.TICKET_TYPE, isActive: true },
    });
    if (!ticketType) {
      throw new AppError('Invalid ticket type', 400, 'VALIDATION_ERROR');
    }
    ticket.ticketTypeId = ticketTypeId;
  }

  // Validate ticket status if provided
  if (ticketStatusId) {
    const ticketStatus = await Lookup.findOne({
      where: { id: ticketStatusId, category: LookupCategory.TICKET_STATUS, isActive: true },
    });
    if (!ticketStatus) {
      throw new AppError('Invalid ticket status', 400, 'VALIDATION_ERROR');
    }
    ticket.ticketStatusId = ticketStatusId;
  }

  // Update other fields
  if (contractId !== undefined) ticket.contractId = contractId;
  if (branchId !== undefined) ticket.branchId = branchId;
  if (zoneId !== undefined) ticket.zoneId = zoneId;
  if (locationMap !== undefined) ticket.locationMap = locationMap;
  if (locationDescription !== undefined) ticket.locationDescription = locationDescription;
  if (ticketDate !== undefined) ticket.ticketDate = ticketDate;
  if (ticketTimeFrom !== undefined) ticket.ticketTimeFrom = ticketTimeFrom;
  if (ticketTimeTo !== undefined) ticket.ticketTimeTo = ticketTimeTo;
  if (assignToTeamLeaderId !== undefined) ticket.assignToTeamLeaderId = assignToTeamLeaderId;
  if (assignToTechnicianId !== undefined) ticket.assignToTechnicianId = assignToTechnicianId;
  if (ticketDescription !== undefined) ticket.ticketDescription = ticketDescription;
  if (havingFemaleEngineer !== undefined) ticket.havingFemaleEngineer = havingFemaleEngineer;
  if (customerName !== undefined) ticket.customerName = customerName;
  if (processId !== undefined) ticket.processId = processId;
  if (withMaterial !== undefined) ticket.withMaterial = withMaterial;
  if (mainServiceId !== undefined) ticket.mainServiceId = mainServiceId;
  if (serviceDescription !== undefined) ticket.serviceDescription = serviceDescription;
  if (tools !== undefined) ticket.tools = tools;
  ticket.updatedBy = user.id;

  await ticket.save();

  // Fetch updated ticket with relations
  const updatedTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: Lookup, as: 'processLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber'] },
    ],
  });

  res.status(200).json({
    success: true,
    message: 'Ticket updated successfully',
    data: formatTicket(updatedTicket!),
  });
});


/**
 * Create a new ticket
 * Only company admins and team leaders can create tickets
 */
export const createTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Check if user has permission (admin or team leader)
  // Assuming admin role lookup name is 'Admin' and team leader is 'Team Leader'
  // You may need to adjust these based on your actual lookup values
  const userRole = await Lookup.findByPk(user.userRoleId);
  if (!userRole) {
    throw new AppError('User role not found', 404, 'NOT_FOUND');
  }

  const roleName = userRole.name.toLowerCase();
  const isAdmin = roleName.includes('admin');
  const isTeamLeader = roleName.includes('team') && roleName.includes('leader');

  if (!isAdmin && !isTeamLeader) {
    throw new AppError('Only company admins and team leaders can create tickets', 403, 'FORBIDDEN');
  }

  const companyId = user.companyId;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const {
    contractId,
    branchId,
    zoneId,
    locationMap,
    locationDescription,
    ticketTypeId,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription,
    havingFemaleEngineer,
    customerName,
    withMaterial,
    mainServiceId,
    serviceDescription,
    tools,
  } = req.body;

  // Validation
  if (!contractId || !branchId || !zoneId || !locationDescription || !ticketTypeId || 
      !ticketDate || !ticketTimeFrom || !ticketTimeTo || !assignToTeamLeaderId || 
      !assignToTechnicianId || !mainServiceId) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
  }

  // Verify ticket type exists
  const ticketType = await Lookup.findOne({
    where: { id: ticketTypeId, category: LookupCategory.TICKET_TYPE, isActive: true },
  });
  if (!ticketType) {
    throw new AppError('Invalid ticket type', 400, 'VALIDATION_ERROR');
  }

  // Get default status (usually "Pending")
  const defaultStatus = await Lookup.findOne({
    where: { category: LookupCategory.TICKET_STATUS, isDefault: true, isActive: true },
  });
  if (!defaultStatus) {
    throw new AppError('Default ticket status not found', 500, 'INTERNAL_ERROR');
  }

  // Generate ticket code (format: COMPANY-TKT-001)
  // This is a simple implementation - you may want to make this more sophisticated
  const company = await Company.findByPk(companyId);
  const companyShortCode = company?.shortCode || 'COMP';
  const lastTicket = await Ticket.findOne({
    where: { companyId },
    order: [['createdAt', 'DESC']],
  });
  const ticketNumber = lastTicket ? parseInt(lastTicket.ticketCodeId.split('-').pop() || '0') + 1 : 1;
  const ticketCodeId = `${companyShortCode}-TKT-${ticketNumber.toString().padStart(3, '0')}`;

  // Create ticket
  const ticket = await Ticket.create({
    ticketCodeId,
    companyId,
    contractId,
    branchId,
    zoneId,
    locationMap: locationMap || '',
    locationDescription,
    ticketTypeId,
    ticketStatusId: defaultStatus.id,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription: ticketDescription || null,
    havingFemaleEngineer: havingFemaleEngineer || false,
    customerName: customerName || null,
    withMaterial: withMaterial || false,
    mainServiceId,
    serviceDescription: serviceDescription || null,
    tools: tools || null,
    createdBy: user.id,
  });

  // Fetch created ticket with relations
  const createdTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber'] },
    ],
  });

  res.status(201).json({
    success: true,
    message: 'Ticket created successfully',
    data: formatTicket(createdTicket!),
  });
});

/**
 * Update an existing ticket
 * Only company admins and team leaders can update tickets
 */
export const updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const ticketId = parseInt(req.params.id);

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (isNaN(ticketId)) {
    throw new AppError('Invalid ticket ID', 400, 'VALIDATION_ERROR');
  }

  // Check if user has permission (admin or team leader)
  const userRole = await Lookup.findByPk(user.userRoleId);
  if (!userRole) {
    throw new AppError('User role not found', 404, 'NOT_FOUND');
  }

  const roleName = userRole.name.toLowerCase();
  const isAdmin = roleName.includes('admin');
  const isTeamLeader = roleName.includes('team') && roleName.includes('leader');

  if (!isAdmin && !isTeamLeader) {
    throw new AppError('Only company admins and team leaders can update tickets', 403, 'FORBIDDEN');
  }

  const companyId = user.companyId;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Find ticket
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId: companyId,
      isDeleted: false,
    },
  });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied', 404, 'NOT_FOUND');
  }

  // Update fields
  const {
    contractId,
    branchId,
    zoneId,
    locationMap,
    locationDescription,
    ticketTypeId,
    ticketStatusId,
    ticketDate,
    ticketTimeFrom,
    ticketTimeTo,
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription,
    havingFemaleEngineer,
    customerName,
    processId,
    withMaterial,
    mainServiceId,
    serviceDescription,
    tools,
  } = req.body;

  // Validate ticket type if provided
  if (ticketTypeId) {
    const ticketType = await Lookup.findOne({
      where: { id: ticketTypeId, category: LookupCategory.TICKET_TYPE, isActive: true },
    });
    if (!ticketType) {
      throw new AppError('Invalid ticket type', 400, 'VALIDATION_ERROR');
    }
    ticket.ticketTypeId = ticketTypeId;
  }

  // Validate ticket status if provided
  if (ticketStatusId) {
    const ticketStatus = await Lookup.findOne({
      where: { id: ticketStatusId, category: LookupCategory.TICKET_STATUS, isActive: true },
    });
    if (!ticketStatus) {
      throw new AppError('Invalid ticket status', 400, 'VALIDATION_ERROR');
    }
    ticket.ticketStatusId = ticketStatusId;
  }

  // Update other fields
  if (contractId !== undefined) ticket.contractId = contractId;
  if (branchId !== undefined) ticket.branchId = branchId;
  if (zoneId !== undefined) ticket.zoneId = zoneId;
  if (locationMap !== undefined) ticket.locationMap = locationMap;
  if (locationDescription !== undefined) ticket.locationDescription = locationDescription;
  if (ticketDate !== undefined) ticket.ticketDate = ticketDate;
  if (ticketTimeFrom !== undefined) ticket.ticketTimeFrom = ticketTimeFrom;
  if (ticketTimeTo !== undefined) ticket.ticketTimeTo = ticketTimeTo;
  if (assignToTeamLeaderId !== undefined) ticket.assignToTeamLeaderId = assignToTeamLeaderId;
  if (assignToTechnicianId !== undefined) ticket.assignToTechnicianId = assignToTechnicianId;
  if (ticketDescription !== undefined) ticket.ticketDescription = ticketDescription;
  if (havingFemaleEngineer !== undefined) ticket.havingFemaleEngineer = havingFemaleEngineer;
  if (customerName !== undefined) ticket.customerName = customerName;
  if (processId !== undefined) ticket.processId = processId;
  if (withMaterial !== undefined) ticket.withMaterial = withMaterial;
  if (mainServiceId !== undefined) ticket.mainServiceId = mainServiceId;
  if (serviceDescription !== undefined) ticket.serviceDescription = serviceDescription;
  if (tools !== undefined) ticket.tools = tools;
  ticket.updatedBy = user.id;

  await ticket.save();

  // Fetch updated ticket with relations
  const updatedTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: Lookup, as: 'processLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber'] },
    ],
  });

  res.status(200).json({
    success: true,
    message: 'Ticket updated successfully',
    data: formatTicket(updatedTicket!),
  });
});

