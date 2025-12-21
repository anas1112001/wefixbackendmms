import { Response } from 'express';
import { Ticket } from '../../db/models/ticket.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
import { User } from '../../db/models/user.model';
import { Company } from '../../db/models/company.model';
import { Contract } from '../../db/models/contract.model';
import { Branch } from '../../db/models/branch.model';
import { Zone } from '../../db/models/zone.model';
import { File, FileReferenceType } from '../../db/models/file.model';
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
  // Role IDs: 18 = Admin, 20 = Team Leader
  if (user.userRoleId !== 18 && user.userRoleId !== 20) {
    throw new AppError('Forbidden: Only Admins and Team Leaders can create tickets', 403, 'FORBIDDEN');
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
    fileIds, // Array of file IDs to link to this ticket
  } = req.body;

  // Validation
  if (!contractId || !branchId || !zoneId || !locationDescription || !locationMap || !ticketTypeId || 
      !ticketDate || !ticketTimeFrom || !ticketTimeTo || !assignToTeamLeaderId || 
      !assignToTechnicianId || !mainServiceId) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
  }

  // Role-based validation: Team Leaders CANNOT create tickets for another Team Leader
  // They can ONLY assign tickets to themselves (their own user ID)
  if (user.userRoleId === 20 && assignToTeamLeaderId !== user.id) {
    throw new AppError(
      'Team Leaders can only create tickets assigned to themselves. You cannot assign tickets to another Team Leader.',
      403,
      'FORBIDDEN'
    );
  }

  // Verify contract belongs to user's company
  const contract = await Contract.findByPk(contractId);
  if (!contract || contract.companyId !== companyId) {
    throw new AppError('Invalid contract or contract does not belong to your company', 400, 'VALIDATION_ERROR');
  }

  // Verify branch belongs to user's company
  const branch = await Branch.findByPk(branchId);
  if (!branch || branch.companyId !== companyId) {
    throw new AppError('Invalid branch or branch does not belong to your company', 400, 'VALIDATION_ERROR');
  }

  // Verify zone belongs to the branch
  const zone = await Zone.findByPk(zoneId);
  if (!zone || zone.branchId !== branchId) {
    throw new AppError('Invalid zone or zone does not belong to the selected branch', 400, 'VALIDATION_ERROR');
  }

  // Verify Team Leader belongs to user's company and has Team Leader role
  const teamLeader = await User.findOne({
    where: { id: assignToTeamLeaderId, companyId, isDeleted: false },
    include: [{ model: Lookup, as: 'userRoleLookup', required: false }],
  });
  if (!teamLeader) {
    throw new AppError('Team Leader not found or does not belong to your company', 400, 'VALIDATION_ERROR');
  }
  if (teamLeader.userRoleId !== 20) {
    throw new AppError('Assigned user is not a Team Leader', 400, 'VALIDATION_ERROR');
  }

  // Verify Technician belongs to user's company and has Technician role
  const technician = await User.findOne({
    where: { id: assignToTechnicianId, companyId, isDeleted: false },
    include: [{ model: Lookup, as: 'userRoleLookup', required: false }],
  });
  if (!technician) {
    throw new AppError('Technician not found or does not belong to your company', 400, 'VALIDATION_ERROR');
  }
  // Technician role ID is typically 21 or 22 (check your lookup table)
  // For now, we'll just verify they're not a Team Leader or Admin
  if (technician.userRoleId === 18 || technician.userRoleId === 20) {
    throw new AppError('Assigned user cannot be an Admin or Team Leader', 400, 'VALIDATION_ERROR');
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
  const companyShortCode = company?.ticketShortCode || 'COMP';
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
    source: 'Mobile', // Set source to Mobile for tickets created from mobile app (backend-mms)
    createdBy: user.id,
  });

  // Link files to ticket if fileIds are provided
  if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
    // Update files to link them to this ticket
    await File.update(
      {
        entityId: ticket.id, // Link to ticket using legacy column
      },
      {
        where: {
          id: { [Op.in]: fileIds },
        },
      }
    );
  }

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
 * Only Company Admin (18) and Team Leader (20) can update tickets
 * Rejects unauthorized updates
 * Tracks updatedBy & updatedAt automatically
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
  // Role IDs: 18 = Admin, 20 = Team Leader
  if (user.userRoleId !== 18 && user.userRoleId !== 20) {
    throw new AppError(
      'Forbidden: Only Company Admins and Team Leaders can update tickets',
      403,
      'FORBIDDEN'
    );
  }

  const companyId = user.companyId;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Find ticket and verify it belongs to user's company
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId: companyId,
      isDeleted: false,
    },
  });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied. You can only update tickets from your company.', 404, 'NOT_FOUND');
  }

  // Update fields
  const {
    fileIds, // Array of file IDs to link to this ticket
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

  // Role-based validation: Team Leaders can only update tickets assigned to themselves
  // They cannot reassign tickets to another Team Leader
  if (user.userRoleId === 20 && assignToTeamLeaderId !== undefined && assignToTeamLeaderId !== user.id) {
    throw new AppError(
      'Team Leaders can only update tickets assigned to themselves. You cannot reassign tickets to another Team Leader.',
      403,
      'FORBIDDEN'
    );
  }

  // Validate hierarchy if fields are being updated
  if (contractId !== undefined) {
    const contract = await Contract.findByPk(contractId);
    if (!contract || contract.companyId !== companyId) {
      throw new AppError('Invalid contract or contract does not belong to your company', 400, 'VALIDATION_ERROR');
    }
  }

  if (branchId !== undefined) {
    const branch = await Branch.findByPk(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new AppError('Invalid branch or branch does not belong to your company', 400, 'VALIDATION_ERROR');
    }
  }

  if (zoneId !== undefined) {
    const zone = await Zone.findByPk(zoneId);
    const finalBranchId = branchId !== undefined ? branchId : ticket.branchId;
    if (!zone || zone.branchId !== finalBranchId) {
      throw new AppError('Invalid zone or zone does not belong to the selected branch', 400, 'VALIDATION_ERROR');
    }
  }

  // Validate Team Leader if being updated
  if (assignToTeamLeaderId !== undefined) {
    const teamLeader = await User.findOne({
      where: { id: assignToTeamLeaderId, companyId, isDeleted: false },
      include: [{ model: Lookup, as: 'userRoleLookup', required: false }],
    });
    if (!teamLeader) {
      throw new AppError('Team Leader not found or does not belong to your company', 400, 'VALIDATION_ERROR');
    }
    if (teamLeader.userRoleId !== 20) {
      throw new AppError('Assigned user is not a Team Leader', 400, 'VALIDATION_ERROR');
    }
  }

  // Validate Technician if being updated
  if (assignToTechnicianId !== undefined) {
    const technician = await User.findOne({
      where: { id: assignToTechnicianId, companyId, isDeleted: false },
      include: [{ model: Lookup, as: 'userRoleLookup', required: false }],
    });
    if (!technician) {
      throw new AppError('Technician not found or does not belong to your company', 400, 'VALIDATION_ERROR');
    }
    if (technician.userRoleId === 18 || technician.userRoleId === 20) {
      throw new AppError('Assigned user cannot be an Admin or Team Leader', 400, 'VALIDATION_ERROR');
    }
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
  if (withMaterial !== undefined) ticket.withMaterial = withMaterial;
  if (mainServiceId !== undefined) ticket.mainServiceId = mainServiceId;
  if (serviceDescription !== undefined) ticket.serviceDescription = serviceDescription;
  if (tools !== undefined) ticket.tools = tools;
  
  // Track who updated the ticket and when
  // updatedAt is automatically set by Sequelize @UpdatedAt decorator
  ticket.updatedBy = user.id;

  await ticket.save();

  // Link files to ticket if fileIds are provided
  if (fileIds !== undefined && Array.isArray(fileIds) && fileIds.length > 0) {
    // Update files to link them to this ticket
    await File.update(
      {
        entityId: ticket.id, // Link to ticket using legacy column
      },
      {
        where: {
          id: { [Op.in]: fileIds },
        },
      }
    );
  }

  // Fetch updated ticket with relations
  const updatedTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber'] },
    ],
  });

  res.status(200).json({
    success: true,
    message: 'Ticket updated successfully',
    data: formatTicket(updatedTicket!),
  });
});

