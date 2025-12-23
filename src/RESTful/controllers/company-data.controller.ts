import { Response } from 'express';
import { Op } from 'sequelize';

import { Branch } from '../../db/models/branch.model';
import { Contract } from '../../db/models/contract.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
import { Zone } from '../../db/models/zone.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError, asyncHandler } from '../middleware/error.middleware';

/**
 * Get contracts for the logged-in company admin's company
 */
export const getCompanyContracts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const contracts = await Contract.findAll({
    where: {
      companyId,
      isDeleted: false,
    },
    order: [['createdAt', 'DESC']],
  });

  const formattedContracts = contracts.map((contract) => ({
    id: contract.id,
    title: contract.contractReference,
    subtitle: contract.contractTitle,
    contractReference: contract.contractReference,
    contractTitle: contract.contractTitle,
  }));

  res.status(200).json({
    success: true,
    message: 'Contracts retrieved successfully',
    data: formattedContracts,
  });
});

/**
 * Get branches for the logged-in company admin's company
 */
export const getCompanyBranches = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const branches = await Branch.findAll({
    where: {
      companyId,
      isDeleted: false,
    },
    order: [['createdAt', 'DESC']],
  });

  const formattedBranches = branches.map((branch) => ({
    id: branch.id,
    title: branch.branchTitle,
    subtitle: branch.branchNameArabic || branch.branchNameEnglish || '',
    branchTitle: branch.branchTitle,
    branchNameArabic: branch.branchNameArabic,
    branchNameEnglish: branch.branchNameEnglish,
  }));

  res.status(200).json({
    success: true,
    message: 'Branches retrieved successfully',
    data: formattedBranches,
  });
});

/**
 * Get zones for the logged-in company admin's company branches
 * Optionally filter by branchId if provided as query parameter
 */
export const getCompanyZones = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Get branchId from query parameter if provided
  const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;

  // Build where clause for zones
  const zoneWhereClause: any = {
    isDeleted: false,
  };

  if (branchId) {
    // If branchId is provided, verify it belongs to the company
    const branch = await Branch.findOne({
      where: {
        id: branchId,
        companyId,
        isDeleted: false,
      },
    });

    if (!branch) {
      throw new AppError('Invalid branch or branch does not belong to your company', 400, 'VALIDATION_ERROR');
    }

    // Filter zones by the specific branch
    zoneWhereClause.branchId = branchId;
  } else {
    // If no branchId provided, get all branches for the company first
    const branches = await Branch.findAll({
      where: {
        companyId,
        isDeleted: false,
      },
      attributes: ['id'],
    });

    const branchIds = branches.map((b) => b.id);

    if (branchIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Zones retrieved successfully',
        data: [],
      });
    }

    // Get zones for all company branches
    zoneWhereClause.branchId = { [Op.in]: branchIds };
  }

  // Get zones based on the where clause
  const zones = await Zone.findAll({
    where: zoneWhereClause,
    order: [['createdAt', 'DESC']],
  });

  const formattedZones = zones.map((zone) => ({
    id: zone.id,
    title: zone.zoneTitle,
    subtitle: zone.zoneNumber || zone.zoneDescription || '',
    zoneTitle: zone.zoneTitle,
    zoneNumber: zone.zoneNumber,
    zoneDescription: zone.zoneDescription,
  }));

  res.status(200).json({
    success: true,
    message: 'Zones retrieved successfully',
    data: formattedZones,
  });
});

/**
 * Get main services (lookups with category MAIN_SERVICE)
 */
export const getMainServices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const services = await Lookup.findAll({
    where: {
      category: LookupCategory.MAIN_SERVICE,
      isActive: true,
    },
    order: [['orderId', 'ASC']],
  });

  const formattedServices = services.map((service) => ({
    id: service.id,
    title: service.name,
    subtitle: service.nameArabic || '',
    name: service.name,
    nameArabic: service.nameArabic,
    icon: service.icon || null,
    image: service.icon || null, // Alias for backward compatibility
  }));

  res.status(200).json({
    success: true,
    message: 'Main services retrieved successfully',
    data: formattedServices,
  });
});

/**
 * Get sub services (lookups with category SUB_SERVICE)
 * Optionally filter by parentServiceId if provided as query param
 */
export const getSubServices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parentServiceId = req.query.parentServiceId as string | undefined;

  const whereClause: any = {
    category: LookupCategory.SUB_SERVICE,
    isActive: true,
  };

  // If parentServiceId is provided, filter by parentLookupId
  if (parentServiceId) {
    whereClause.parentLookupId = parseInt(parentServiceId);
  }

  const services = await Lookup.findAll({
    where: whereClause,
    order: [['orderId', 'ASC']],
  });

  const formattedServices = services.map((service) => ({
    id: service.id,
    title: service.name,
    subtitle: service.nameArabic || '',
    name: service.name,
    nameArabic: service.nameArabic,
    parentId: service.parentLookupId,
  }));

  res.status(200).json({
    success: true,
    message: 'Sub services retrieved successfully',
    data: formattedServices,
  });
});

/**
 * Get team leaders for the logged-in company admin's company
 * Team Leaders have roleId = 20
 */
export const getCompanyTeamLeaders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Import User model dynamically to avoid circular dependencies
  const { User } = await import('../../db/models/user.model');

  const teamLeaders = await User.findAll({
    where: {
      companyId,
      userRoleId: 20, // Team Leader role (20)
      isActive: true,
      isDeleted: false,
    },
    attributes: ['id', 'fullName', 'userNumber', 'email'],
    order: [['fullName', 'ASC']],
  });

  const formattedTeamLeaders = teamLeaders.map((leader) => ({
    id: leader.id,
    title: leader.fullName,
    subtitle: leader.userNumber || leader.email || '',
    fullName: leader.fullName,
    userNumber: leader.userNumber,
    email: leader.email,
  }));

  res.status(200).json({
    success: true,
    message: 'Team leaders retrieved successfully',
    data: formattedTeamLeaders,
  });
});

/**
 * Get technicians for the logged-in company admin's company
 * Technicians have roleId = 21
 */
export const getCompanyTechnicians = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {user} = req;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const {companyId} = user;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Import User model dynamically to avoid circular dependencies
  const { User } = await import('../../db/models/user.model');

  const technicians = await User.findAll({
    where: {
      companyId,
      userRoleId: 21, // Technician role (21)
      isActive: true,
      isDeleted: false,
    },
    attributes: ['id', 'fullName', 'userNumber', 'email'],
    order: [['fullName', 'ASC']],
  });

  const formattedTechnicians = technicians.map((technician) => ({
    id: technician.id,
    title: technician.fullName,
    subtitle: technician.userNumber || technician.email || '',
    fullName: technician.fullName,
    userNumber: technician.userNumber,
    email: technician.email,
  }));

  res.status(200).json({
    success: true,
    message: 'Technicians retrieved successfully',
    data: formattedTechnicians,
  });
});

/**
 * Get ticket types (lookups with category TICKET_TYPE)
 */
export const getTicketTypes = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticketTypes = await Lookup.findAll({
    where: { category: LookupCategory.TICKET_TYPE, isActive: true },
    attributes: ['id', 'name', 'nameArabic', 'category'],
    order: [['orderId', 'ASC']],
  });

  const formattedTypes = ticketTypes.map((type) => ({
    id: type.id,
    title: type.name,
    subtitle: type.nameArabic || '',
    name: type.name,
    nameArabic: type.nameArabic,
  }));

  res.status(200).json({
    success: true,
    message: 'Ticket types retrieved successfully',
    data: formattedTypes,
  });
});

/**
 * Get ticket statuses (lookups with category TICKET_STATUS)
 */
export const getTicketStatuses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const ticketStatuses = await Lookup.findAll({
    where: { category: LookupCategory.TICKET_STATUS, isActive: true },
    attributes: ['id', 'name', 'nameArabic', 'category'],
    order: [['orderId', 'ASC']],
  });

  const formattedStatuses = ticketStatuses.map((status) => ({
    id: status.id,
    title: status.name,
    subtitle: status.nameArabic || '',
    name: status.name,
    nameArabic: status.nameArabic,
  }));

  res.status(200).json({
    success: true,
    message: 'Ticket statuses retrieved successfully',
    data: formattedStatuses,
  });
});



