import express from 'express';

import * as userController from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.post('/login', userController.login);
router.post('/logout', authenticateToken, userController.logout);
router.post('/register', userController.createUser);
router.post('/refresh-token', userController.refreshAccessToken);
router.get('/token/:token', userController.getUserByToken);

// Protected routes
router.get('/me', authenticateToken, userController.getCurrentUser);
router.get('/profile', authenticateToken, userController.getProfile);
router.get('/', authenticateToken, userController.getAllUsers);
router.get('/students', authenticateToken, userController.getStudents);
router.get('/:id', authenticateToken, userController.getUserById);
router.put('/:id', authenticateToken, userController.updateUser);

// Course-specific routes
router.get(
  '/courses/:courseId/activities/:activityId/students',
  authenticateToken,
  userController.getStudentsInCourseActivity
);
router.get(
  '/activities/:activityId/students/:userId',
  authenticateToken,
  userController.getStudentInCourseActivity
);

export default router;


