import express from 'express';
import * as companyDataController from '../controllers/company-data.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Protected routes - require authentication
router.get('/contracts', authenticateToken, companyDataController.getCompanyContracts);
router.get('/branches', authenticateToken, companyDataController.getCompanyBranches);
router.get('/zones', authenticateToken, companyDataController.getCompanyZones);
router.get('/main-services', authenticateToken, companyDataController.getMainServices);
router.get('/sub-services', authenticateToken, companyDataController.getSubServices);

export default router;

