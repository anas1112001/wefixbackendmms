import { Response } from 'express';
import { Ticket } from '../../db/models/ticket.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
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

  // Fetch all tickets for the company
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
    ],
    order: [['createdAt', 'DESC']],
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
        total: tickets.length,
        tickets: tickets.map(formatTicket),
      },
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

  const correctiveType = ticketTypes.find(t => t.name.toLowerCase() === 'corrective');
  const preventiveType = ticketTypes.find(t => t.name.toLowerCase() === 'preventive');
  const emergencyType = ticketTypes.find(t => t.name.toLowerCase() === 'emergency');

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
        corrective: correctiveCount,
        preventive: preventiveCount,
        emergency: emergencyCount,
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

