import { Response } from 'express';
import { Contract } from '../../db/models/contract.model';
import { Branch } from '../../db/models/branch.model';
import { Zone } from '../../db/models/zone.model';
import { Lookup, LookupCategory } from '../../db/models/lookup.model';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';

/**
 * Get contracts for the logged-in company admin's company
 */
export const getCompanyContracts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const contracts = await Contract.findAll({
    where: {
      companyId: companyId,
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
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  const branches = await Branch.findAll({
    where: {
      companyId: companyId,
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
 */
export const getCompanyZones = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  const companyId = user.companyId;

  if (!companyId) {
    throw new AppError('User is not associated with a company', 400, 'VALIDATION_ERROR');
  }

  // Get all branches for the company first
  const branches = await Branch.findAll({
    where: {
      companyId: companyId,
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

  // Get zones for these branches
  const zones = await Zone.findAll({
    where: {
      branchId: { [Op.in]: branchIds },
      isDeleted: false,
    },
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

  // If parentServiceId is provided, filter by parentId
  if (parentServiceId) {
    whereClause.parentId = parseInt(parentServiceId);
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
    parentId: service.parentId,
  }));

  res.status(200).json({
    success: true,
    message: 'Sub services retrieved successfully',
    data: formattedServices,
  });
});

