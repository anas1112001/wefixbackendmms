import { Response } from 'express';
import { Op } from 'sequelize';

import { Branch } from '../../db/models/branch.model';
import { Company } from '../../db/models/company.model';
import { Contract } from '../../db/models/contract.model';
import { File } from '../../db/models/file.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
import { Ticket } from '../../db/models/ticket.model';
import { User } from '../../db/models/user.model';
import { Zone } from '../../db/models/zone.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';


/**
 * Get tickets for the logged-in company admin's company
 * Filters tickets by companyId and groups by ticket type (Corrective, Preventive, Emergency)
 */
export const getCompanyTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Get companyId from the logged-in user
  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Role-based filtering:
  // - Technicians (roleId 21) and Sub-Technicians (roleId 22) can only see tickets assigned to them
  // - Admins (roleId 18) and Team Leaders (roleId 20) can see all company tickets
  const isTechnician = user.userRoleId === 21 || user.userRoleId === 22;
  const whereClause: any = {
    companyId,
    isDeleted: false,
  };

  // If user is a Technician, filter to show only tickets assigned to them
  if (isTechnician) {
    whereClause.assignToTechnicianId = user.id;
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

  // Get total count for pagination (with role-based filtering)
  const totalCount = await Ticket.count({
    where: whereClause,
  });

  // Fetch tickets for the company with pagination (with role-based filtering)
  const tickets = await Ticket.findAll({
    where: whereClause,
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
    limit,
    offset,
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
      page,
      limit,
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
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

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
          companyId,
          ticketTypeId: correctiveType.id,
          isDeleted: false,
        },
      })
    : 0;

  const preventiveCount = preventiveType
    ? await Ticket.count({
        where: {
          companyId,
          ticketTypeId: preventiveType.id,
          isDeleted: false,
        },
      })
    : 0;

  const emergencyCount = emergencyType
    ? await Ticket.count({
        where: {
          companyId,
          ticketTypeId: emergencyType.id,
          isDeleted: false,
        },
      })
    : 0;

  // Get total count for verification
  const totalCount = await Ticket.count({
    where: {
      companyId,
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
          companyId,
          ticketTypeId: correctiveType.id,
          ticketStatusId: completedStatus.id,
          isDeleted: false,
        },
      })
    : 0;

  const preventiveCompleted = preventiveType && completedStatus
    ? await Ticket.count({
        where: {
          companyId,
          ticketTypeId: preventiveType.id,
          ticketStatusId: completedStatus.id,
          isDeleted: false,
        },
      })
    : 0;

  const emergencyCompleted = emergencyType && completedStatus
    ? await Ticket.count({
        where: {
          companyId,
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
        companyId,
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
 * Get ticket details by ID for the logged-in company user
 * Role-based access control:
 * - Technicians (21) and Sub-Technicians (22) can only view tickets assigned to them
 * - Admins (18) and Team Leaders (20) can view all company tickets
 */
export const getTicketById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;
  const ticketId = parseInt(req.params.id);

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (isNaN(ticketId)) {
    throw new AppError('Invalid ticket ID', 400, 'VALIDATION_ERROR');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Role-based filtering: Technicians can only view tickets assigned to them
  const isTechnician = user.userRoleId === 21 || user.userRoleId === 22;
  console.log(`[getTicketById] User: ${user.fullName} (ID: ${user.id}, roleId: ${user.userRoleId}), Ticket: ${ticketId}`);
  console.log(`[getTicketById] isTechnician: ${isTechnician}, companyId: ${companyId}`);
  
  const whereClause: any = {
      id: ticketId,
      companyId,
      isDeleted: false,
  };

  // If user is a Technician, verify the ticket is assigned to them
  if (isTechnician) {
    whereClause.assignToTechnicianId = user.id;
    console.log(`[getTicketById] Technician access - filtering by assignToTechnicianId: ${user.id}`);
  }

  // Fetch ticket with all related data
  console.log(`[getTicketById] Querying ticket with whereClause:`, whereClause);
  const ticket = await Ticket.findOne({
    where: whereClause,
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
        as: 'assignToTeamLeaderUser',
        required: false,
        attributes: ['id', 'fullName', 'userNumber'],
      },
      {
        model: User,
        as: 'assignToTechnicianUser',
        required: false,
        attributes: ['id', 'fullName', 'userNumber'],
      },
      {
        model: Contract,
        as: 'contract',
        required: false,
        attributes: ['id', 'contractTitle', 'contractReference'],
      },
      {
        model: Branch,
        as: 'branch',
        required: false,
        attributes: ['id', 'branchTitle', 'branchNameArabic', 'branchNameEnglish'],
      },
      {
        model: Zone,
        as: 'zone',
        required: false,
        attributes: ['id', 'zoneTitle', 'zoneNumber', 'zoneDescription'],
      },
      {
        model: User,
        as: 'creator',
        required: false,
        attributes: ['id', 'fullName', 'userNumber'],
      },
      {
        model: User,
        as: 'updater',
        required: false,
        attributes: ['id', 'fullName', 'userNumber'],
      },
    ],
  });

  if (!ticket) {
    console.log(`[getTicketById] Ticket not found - ticketId: ${ticketId}, userId: ${user.id}, userRoleId: ${user.userRoleId}`);
    throw new AppError(
      isTechnician 
        ? 'Ticket not found or not assigned to you. You can only view tickets assigned to you.' 
        : 'Ticket not found or access denied',
      404,
      'NOT_FOUND'
    );
  }
  
  console.log(`[getTicketById] Ticket found - ID: ${ticket.id}, assignToTechnicianId: ${ticket.assignToTechnicianId}`);

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

  // Fetch files attached to this ticket from files table
  // Files are linked to tickets using entityId (ticket ID) and entityType ('ticket' for new records, 'user' for old records)
  // Note: referenceType column doesn't exist in database, so we use entityType to identify ticket attachments
  // Note: File model does not have isDeleted column, so we don't filter by it
  const ticketFiles = await File.findAll({
    where: {
      entityId: ticketId,
      entityType: { [Op.in]: ['ticket', 'user'] }, // Support both 'ticket' (new) and 'user' (old) entity_type
    },
    attributes: ['id', 'filename', 'originalFilename', 'path', 'filePath', 'size', 'fileSizeMB', 'category', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });

  const ticketData = formatTicket(ticket);
  ticketData.tools = toolsWithNames;
  ticketData.files = ticketFiles.map(file => {
    // Convert server file path to accessible URL
    // Server path: /app/uploads/filename.ext or /path/to/app/uploads/filename.ext
    // URL path: /uploads/filename.ext
    const filePath = file.filePath ?? file.path ?? '';
    
    // Extract filename from path
    const filename = filePath.split('/').pop() || file.filename || '';
    
    // Build accessible URL: /uploads/filename
    // This will be served by express.static('/uploads') route
    const fileUrl = filename ? `/uploads/${filename}` : '';
    
    return {
      id: file.id,
      fileName: file.originalFilename ?? file.filename ?? '',
      filePath: fileUrl, // Use URL path instead of server path
      fileSize: file.size ?? 0,
      category: file.category ?? 'other',
      createdAt: file.createdAt,
    };
  });

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
    contract: ticket.contract
      ? {
          id: ticket.contract.id,
          title: ticket.contract.contractTitle,
          reference: ticket.contract.contractReference,
        }
      : null,
    branchId: ticket.branchId,
    branch: ticket.branch
      ? {
          id: ticket.branch.id,
          title: ticket.branch.branchTitle,
          nameArabic: ticket.branch.branchNameArabic,
          nameEnglish: ticket.branch.branchNameEnglish,
        }
      : null,
    zoneId: ticket.zoneId,
    zone: ticket.zone
      ? {
          id: ticket.zone.id,
          title: ticket.zone.zoneTitle,
          number: ticket.zone.zoneNumber,
        }
      : null,
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
    teamLeader: ticket.assignToTeamLeaderUser
      ? {
          id: ticket.assignToTeamLeaderUser.id,
          name: ticket.assignToTeamLeaderUser.fullName,
          userNumber: ticket.assignToTeamLeaderUser.userNumber,
        }
      : null,
    technician: ticket.assignToTechnicianUser
      ? {
          id: ticket.assignToTechnicianUser.id,
          name: ticket.assignToTechnicianUser.fullName,
          userNumber: ticket.assignToTechnicianUser.userNumber,
        }
      : null,
    source: ticket.source,
    createdBy: ticket.createdBy,
    creator: ticket.creator
      ? {
          id: ticket.creator.id,
          name: ticket.creator.fullName,
          userNumber: ticket.creator.userNumber,
        }
      : null,
    updatedBy: ticket.updatedBy,
    updater: ticket.updater
      ? {
          id: ticket.updater.id,
          name: ticket.updater.fullName,
          userNumber: ticket.updater.userNumber,
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
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Check if user has permission (admin or team leader)
  // Role IDs: 18 = Admin, 20 = Team Leader
  if (user.userRoleId !== 18 && user.userRoleId !== 20) {
    throw new AppError('Forbidden: Only Admins and Team Leaders can create tickets', 403, 'FORBIDDEN');
  }

  const {companyId} = user;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const {
    assignToTeamLeaderId,
    assignToTechnicianId,
    branchId,
    contractId,
    customerName,
    fileIds,
    havingFemaleEngineer,
    locationDescription,
    locationMap,
    mainServiceId,
    serviceDescription,
    ticketDate,
    ticketDescription,
    ticketTimeFrom,
    ticketTimeTo,
    ticketTypeId,
    tools,
    withMaterial,
    zoneId, // Array of file IDs to link to this ticket
  } = req.body;

  // Get ticket type to check if it's Emergency and validate it exists
  const ticketType = await Lookup.findOne({
    where: { id: ticketTypeId, category: LookupCategory.TICKET_TYPE, isActive: true },
  });
  if (!ticketType) {
    throw new AppError('Invalid ticket type', 400, 'VALIDATION_ERROR');
  }
  
  const isEmergency = ticketType.name.toLowerCase() === 'emergency' || 
                      ticketType.code === 'EMRG';

  // Validation - Emergency tickets now have time slots (current time + 120 minutes)
  const baseRequiredFields = !contractId || !branchId || !zoneId || !locationDescription || 
                             !ticketTypeId || !ticketDate || !ticketTimeFrom || !ticketTimeTo ||
                             !assignToTeamLeaderId || !assignToTechnicianId || !mainServiceId;
  
  // Location map is optional (can be null)
  
  if (baseRequiredFields) {
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

  // Ticket type already verified above

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
    locationMap: locationMap || null, // Optional field
    locationDescription,
    ticketTypeId,
    ticketStatusId: defaultStatus.id,
    ticketDate,
    ticketTimeFrom, // Emergency tickets now have time slots (current time + 120 minutes)
    ticketTimeTo, // Emergency tickets now have time slots (current time + 120 minutes)
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
 * - Company Admin (18) and Team Leader (20) can update all ticket fields
 * - Restricted roles (21, 22, 23, 26) CANNOT update tickets
 * Rejects unauthorized updates
 * Tracks updatedBy & updatedAt automatically
 */
export const updateTicket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;
  const ticketId = parseInt(req.params.id);

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  if (isNaN(ticketId)) {
    throw new AppError('Invalid ticket ID', 400, 'VALIDATION_ERROR');
  }

  const {companyId} = user;
  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Check user role
  const isAdmin = user.userRoleId === 18;
  const isTeamLeader = user.userRoleId === 20;
  const isTechnician = user.userRoleId === 21 || user.userRoleId === 22; // Technician (21) or Sub-Technician (22)
  const isSuperUser = user.userRoleId === 26; // Super User
  const isCompletelyRestricted = user.userRoleId === 23; // Role 23 cannot edit at all

  // Block completely restricted roles (23)
  if (isCompletelyRestricted) {
    throw new AppError(
      `Forbidden: Users with role ${user.userRoleId} cannot update tickets.`,
      403,
      'FORBIDDEN'
    );
  }

  // Allow Admin (18), Team Leader (20), Technicians (21, 22), and Super User (26)
  if (!isAdmin && !isTeamLeader && !isTechnician && !isSuperUser) {
    throw new AppError(
      `Forbidden: Your role (${user.userRoleId}) does not have permission to update tickets.`,
      403,
      'FORBIDDEN'
    );
  }

  // Find ticket and verify it belongs to user's company
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId,
      isDeleted: false,
    },
  });

  if (!ticket) {
    throw new AppError('Ticket not found or access denied. You can only update tickets from your company.', 404, 'NOT_FOUND');
  }

  // Technicians can only update tickets assigned to them
  if (isTechnician && ticket.assignToTechnicianId !== user.id) {
    throw new AppError(
      'Forbidden: You can only update tickets assigned to you',
      403,
      'FORBIDDEN'
    );
  }

  // Update fields
  const {
    assignToTeamLeaderId, // Array of file IDs to link to this ticket
    assignToTechnicianId,
    branchId,
    contractId,
    customerName,
    fileIds,
    havingFemaleEngineer,
    locationDescription,
    locationMap,
    mainServiceId,
    serviceDescription,
    ticketDate,
    ticketDescription,
    ticketStatusId,
    ticketTimeFrom,
    ticketTimeTo,
    ticketTypeId,
    tools,
    withMaterial,
    zoneId,
  } = req.body;

  // Technicians can ONLY update ticket status and add notes/comments
  // Reject any other field updates from Technicians
  if (isTechnician) {
    const allowedFields = ['ticketStatusId', 'serviceDescription']; // Allow status and notes
    const providedFields = Object.keys(req.body).filter(key => req.body[key] !== undefined && key !== 'fileIds');
    const unauthorizedFields = providedFields.filter(field => !allowedFields.includes(field));

    if (unauthorizedFields.length > 0) {
      throw new AppError(
        `Forbidden: Technicians can only update ticket status and add notes. Cannot update: ${unauthorizedFields.join(', ')}`,
        403,
        'FORBIDDEN'
      );
    }
  }

  // Validate ticket type if provided (only for Admin/Team Leader/Super User)
  if (ticketTypeId && !isTechnician) {
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
  // Admins and Super Users can reassign tickets to any Team Leader
  if (isTeamLeader && assignToTeamLeaderId !== undefined && assignToTeamLeaderId !== user.id) {
    throw new AppError(
      'Team Leaders can only update tickets assigned to themselves. You cannot reassign tickets to another Team Leader.',
      403,
      'FORBIDDEN'
    );
  }

  // Validate hierarchy if fields are being updated (only for Admin/Team Leader/Super User)
  if (contractId !== undefined && !isTechnician) {
    const contract = await Contract.findByPk(contractId);
    if (!contract || contract.companyId !== companyId) {
      throw new AppError('Invalid contract or contract does not belong to your company', 400, 'VALIDATION_ERROR');
    }
  }

  if (branchId !== undefined && !isTechnician) {
    const branch = await Branch.findByPk(branchId);
    if (!branch || branch.companyId !== companyId) {
      throw new AppError('Invalid branch or branch does not belong to your company', 400, 'VALIDATION_ERROR');
    }
  }

  if (zoneId !== undefined && !isTechnician) {
    const zone = await Zone.findByPk(zoneId);
    const finalBranchId = branchId !== undefined ? branchId : ticket.branchId;
    if (!zone || zone.branchId !== finalBranchId) {
      throw new AppError('Invalid zone or zone does not belong to the selected branch', 400, 'VALIDATION_ERROR');
    }
  }

  // Validate Team Leader if being updated (only for Admin/Team Leader/Super User)
  if (assignToTeamLeaderId !== undefined && !isTechnician) {
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

  // Validate Technician if being updated (only for Admin/Team Leader/Super User)
  if (assignToTechnicianId !== undefined && !isTechnician) {
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

  // Update other fields (only for Admin/Team Leader/Super User, Technicians can only update status and notes)
  if (contractId !== undefined && !isTechnician) ticket.contractId = contractId;
  if (branchId !== undefined && !isTechnician) ticket.branchId = branchId;
  if (zoneId !== undefined && !isTechnician) ticket.zoneId = zoneId;
  if (locationMap !== undefined && !isTechnician) ticket.locationMap = locationMap || null; // Allow null for optional field
  if (locationDescription !== undefined && !isTechnician) ticket.locationDescription = locationDescription;
  if (ticketDate !== undefined && !isTechnician) ticket.ticketDate = ticketDate;
  if (ticketTimeFrom !== undefined && !isTechnician) ticket.ticketTimeFrom = ticketTimeFrom;
  if (ticketTimeTo !== undefined && !isTechnician) ticket.ticketTimeTo = ticketTimeTo;
  if (assignToTeamLeaderId !== undefined && !isTechnician) ticket.assignToTeamLeaderId = assignToTeamLeaderId;
  if (assignToTechnicianId !== undefined && !isTechnician) ticket.assignToTechnicianId = assignToTechnicianId;
  if (ticketDescription !== undefined && !isTechnician) ticket.ticketDescription = ticketDescription;
  if (havingFemaleEngineer !== undefined && !isTechnician) ticket.havingFemaleEngineer = havingFemaleEngineer;
  if (customerName !== undefined && !isTechnician) ticket.customerName = customerName;
  if (withMaterial !== undefined && !isTechnician) ticket.withMaterial = withMaterial;
  if (mainServiceId !== undefined && !isTechnician) ticket.mainServiceId = mainServiceId;
  if (serviceDescription !== undefined) ticket.serviceDescription = serviceDescription; // Allow for both Technicians and Admin/Team Leader/Super User
  if (tools !== undefined && !isTechnician) ticket.tools = tools;
  
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

