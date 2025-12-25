import { Response } from 'express';
import fs from 'fs';
import path from 'path';
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
        attributes: ['id', 'fullName', 'userNumber', 'profileImage'],
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
        attributes: ['id', 'fullName', 'userNumber', 'profileImage'],
      },
      {
        model: User,
        as: 'assignToTechnicianUser',
        required: false,
        attributes: ['id', 'fullName', 'userNumber', 'profileImage'],
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
    // Use the path from database (should be /WeFixFiles/tickets/{ticketId}/filename)
    // If path is not in correct format, construct it
    let filePath = file.filePath ?? file.path ?? '';
    
    // If path doesn't include /tickets/{ticketId}/, construct it
    if (!filePath.includes(`/tickets/${ticket.id}/`)) {
      const fileName = file.filename || filePath.split('/').pop() || '';
      filePath = `/WeFixFiles/tickets/${ticket.id}/${fileName}`;
    }
    
    return {
      id: file.id,
      fileName: file.originalFilename ?? file.filename ?? '',
      filePath: filePath, // Use public path format
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
    ticketTitle: ticket.ticketTitle,
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
          icon: ticket.mainServiceLookup.icon || null,
          image: ticket.mainServiceLookup.icon || null, // Alias for backward compatibility
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
          profileImage: ticket.assignToTeamLeaderUser.profileImage || null,
        }
      : null,
    technician: ticket.assignToTechnicianUser
      ? {
          id: ticket.assignToTechnicianUser.id,
          name: ticket.assignToTechnicianUser.fullName,
          userNumber: ticket.assignToTechnicianUser.userNumber,
          profileImage: ticket.assignToTechnicianUser.profileImage || null,
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
    ticketTitle,
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
  // Ticket title is required
  const missingFields: string[] = [];
  
  if (!contractId) missingFields.push('contractId');
  if (!branchId) missingFields.push('branchId');
  if (!zoneId) missingFields.push('zoneId');
  if (!ticketTypeId) missingFields.push('ticketTypeId');
  if (!ticketDate) missingFields.push('ticketDate');
  if (!ticketTimeFrom) missingFields.push('ticketTimeFrom');
  if (!ticketTimeTo) missingFields.push('ticketTimeTo');
  if (!assignToTeamLeaderId) missingFields.push('assignToTeamLeaderId');
  if (!assignToTechnicianId) missingFields.push('assignToTechnicianId');
  if (!mainServiceId) missingFields.push('mainServiceId');
  if (!ticketTitle || ticketTitle.trim() === '') missingFields.push('ticketTitle');
  
  // Location map and location description are optional (can be null)
  
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(', ')}`,
      400,
      'VALIDATION_ERROR',
      { missingFields }
    );
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

  // Get company for ticket code generation
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError('Company not found', 400, 'VALIDATION_ERROR');
  }

  // Create ticket first (we need the ticket ID to generate the code)
  const ticket = await Ticket.create({
    ticketCodeId: 'TEMP', // Temporary value, will be updated after creation
    companyId,
    contractId,
    branchId,
    zoneId,
    locationMap: locationMap || null, // Optional field
    ticketTitle: ticketTitle || '', // Required field
    ticketTypeId,
    ticketStatusId: defaultStatus.id,
    ticketDate,
    ticketTimeFrom, // Emergency tickets now have time slots (current time + 120 minutes)
    ticketTimeTo, // Emergency tickets now have time slots (current time + 120 minutes)
    assignToTeamLeaderId,
    assignToTechnicianId,
    ticketDescription: ticketDescription || '',
    havingFemaleEngineer: havingFemaleEngineer || false,
    customerName: customerName || null,
    withMaterial: withMaterial || false,
    mainServiceId,
    serviceDescription: serviceDescription || null,
    tools: tools || null,
    source: 'Mobile', // Set source to Mobile for tickets created from mobile app (backend-mms)
    createdBy: user.id,
  });

  // Generate ticket code (format: {COMPANY_NAME}-TKT-{TICKET_ID})
  // Extract company name from title and convert to uppercase (e.g., "gamma solutions" -> "GAMMA")
  const companyName = company.title.toUpperCase().split(' ')[0]; // Take first word and uppercase
  const ticketCodeId = `${companyName}-TKT-${ticket.id}`;
  
  // Update ticket with the generated code
  await ticket.update({ ticketCodeId });

  // Link files to ticket and move to ticket folder if fileIds are provided
  if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
    // Get all files that need to be moved
    const files = await File.findAll({
      where: {
        id: { [Op.in]: fileIds },
      },
    });

    // Create ticket-specific folder
    const ticketFolder = path.join(process.cwd(), 'public', 'WeFixFiles', 'tickets', String(ticket.id));
    if (!fs.existsSync(ticketFolder)) {
      fs.mkdirSync(ticketFolder, { recursive: true });
    }

    // Move files and update paths
    for (const file of files) {
      const oldPath = (file as any).path || (file as any).filePath;
      const fileName = (file as any).filename || path.basename(oldPath || '');
      const newPath = `/WeFixFiles/tickets/${ticket.id}/${fileName}`;
      const newFilePath = path.join(ticketFolder, fileName);

      // Skip if file is already in the correct location
      if (fs.existsSync(newFilePath)) {
        // File already in correct location, just update database
      } else if (oldPath && !oldPath.includes(`/tickets/${ticket.id}/`)) {
        // Files uploaded before ticket creation are saved to Contracts or Images
        // Search in all possible locations
        const searchPaths = [
          // Try the path from database first
          oldPath.startsWith('/') 
            ? path.join(process.cwd(), 'public', oldPath.replace(/^\//, ''))
            : path.join(process.cwd(), 'public', oldPath),
          // Always check Contracts and Images folders
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Contracts', fileName),
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Images', fileName),
        ];
        
        let fileFound = false;
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            // Ensure destination directory exists
            if (!fs.existsSync(ticketFolder)) {
              fs.mkdirSync(ticketFolder, { recursive: true });
            }
            // Move file to ticket folder
            fs.renameSync(searchPath, newFilePath);
            fileFound = true;
            break;
          }
        }
        
        if (!fileFound) {
          console.warn(`[CreateTicket-MMS] File not found at any expected location for: ${fileName}`);
        }
      } else if (!fs.existsSync(newFilePath)) {
        // File path already points to ticket folder but file doesn't exist there
        // Try to find it in Contracts/Images and move it
        const searchPaths = [
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Contracts', fileName),
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Images', fileName),
        ];
        
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            if (!fs.existsSync(ticketFolder)) {
              fs.mkdirSync(ticketFolder, { recursive: true });
            }
            fs.renameSync(searchPath, newFilePath);
            break;
          }
        }
      }

      // Update file record with new path and link to ticket
      await file.update({
        entityId: ticket.id,
        entityType: 'ticket',
        path: newPath,
        filePath: newPath,
      } as any);
    }
  }

  // Fetch created ticket with relations
  const createdTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber', 'profileImage'] },
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
    ticketTitle,
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
  if (ticketTitle !== undefined && !isTechnician) ticket.ticketTitle = ticketTitle || '';
  if (ticketDate !== undefined && !isTechnician) ticket.ticketDate = ticketDate;
  if (ticketTimeFrom !== undefined && !isTechnician) ticket.ticketTimeFrom = ticketTimeFrom;
  if (ticketTimeTo !== undefined && !isTechnician) ticket.ticketTimeTo = ticketTimeTo;
  if (assignToTeamLeaderId !== undefined && !isTechnician) ticket.assignToTeamLeaderId = assignToTeamLeaderId;
  if (assignToTechnicianId !== undefined && !isTechnician) ticket.assignToTechnicianId = assignToTechnicianId;
  if (ticketDescription !== undefined && !isTechnician) ticket.ticketDescription = ticketDescription || '';
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

  // Link files to ticket and move to ticket folder if fileIds are provided
  if (fileIds !== undefined && Array.isArray(fileIds) && fileIds.length > 0) {
    // Get all files that need to be moved
    const files = await File.findAll({
      where: {
        id: { [Op.in]: fileIds },
      },
    });

    // Create ticket-specific folder
    const ticketFolder = path.join(process.cwd(), 'public', 'WeFixFiles', 'tickets', String(ticket.id));
    if (!fs.existsSync(ticketFolder)) {
      fs.mkdirSync(ticketFolder, { recursive: true });
    }

    // Move files and update paths
    for (const file of files) {
      const oldPath = (file as any).path || (file as any).filePath;
      const fileName = (file as any).filename || path.basename(oldPath || '');
      const newPath = `/WeFixFiles/tickets/${ticket.id}/${fileName}`;
      const newFilePath = path.join(ticketFolder, fileName);

      // Skip if file is already in the correct location
      if (fs.existsSync(newFilePath)) {
        // File already in correct location, just update database
      } else if (oldPath && !oldPath.includes(`/tickets/${ticket.id}/`)) {
        // Files uploaded before ticket update are saved to Contracts or Images
        // Search in all possible locations
        const searchPaths = [
          // Try the path from database first
          oldPath.startsWith('/') 
            ? path.join(process.cwd(), 'public', oldPath.replace(/^\//, ''))
            : path.join(process.cwd(), 'public', oldPath),
          // Always check Contracts and Images folders
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Contracts', fileName),
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Images', fileName),
        ];
        
        let fileFound = false;
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            // Ensure destination directory exists
            if (!fs.existsSync(ticketFolder)) {
              fs.mkdirSync(ticketFolder, { recursive: true });
            }
            // Move file to ticket folder
            fs.renameSync(searchPath, newFilePath);
            fileFound = true;
            break;
          }
        }
        
        if (!fileFound) {
          console.warn(`[UpdateTicket-MMS] File not found at any expected location for: ${fileName}`);
        }
      } else if (!fs.existsSync(newFilePath)) {
        // File path already points to ticket folder but file doesn't exist there
        // Try to find it in Contracts/Images and move it
        const searchPaths = [
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Contracts', fileName),
          path.join(process.cwd(), 'public', 'WeFixFiles', 'Images', fileName),
        ];
        
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            if (!fs.existsSync(ticketFolder)) {
              fs.mkdirSync(ticketFolder, { recursive: true });
            }
            fs.renameSync(searchPath, newFilePath);
            break;
          }
        }
      }

      // Update file record with new path and link to ticket
      await file.update({
        entityId: ticket.id,
        entityType: 'ticket',
        path: newPath,
        filePath: newPath,
      } as any);
    }
  }

  // Fetch updated ticket with relations
  const updatedTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Lookup, as: 'ticketTypeLookup', required: false },
      { model: Lookup, as: 'ticketStatusLookup', required: false },
      { model: Lookup, as: 'mainServiceLookup', required: false },
      { model: User, as: 'assignToTechnicianUser', required: false, attributes: ['id', 'fullName', 'userNumber', 'profileImage'] },
    ],
  });

  res.status(200).json({
    success: true,
    message: 'Ticket updated successfully',
    data: formatTicket(updatedTicket!),
  });
});
