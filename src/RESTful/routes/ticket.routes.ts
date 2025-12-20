import express from 'express';
import * as ticketController from '../controllers/ticket.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Protected routes - require authentication
router.get('/', authenticateToken, ticketController.getCompanyTickets);
router.get('/statistics', authenticateToken, ticketController.getTicketStatistics);
router.get('/:id', authenticateToken, ticketController.getTicketById);
router.post('/', authenticateToken, ticketController.createTicket);
router.put('/:id', authenticateToken, ticketController.updateTicket);

export default router;



