import express from 'express';
import userRoutes from './user.routes';
import logRoutes from './log.routes';
import ticketRoutes from './ticket.routes';

const router = express.Router();

// API version 1 routes
router.use('/users', userRoutes);
router.use('/logs', logRoutes);
router.use('/tickets', ticketRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;

