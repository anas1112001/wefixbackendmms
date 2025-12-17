import { Response } from 'express';
import jwt from 'jsonwebtoken';
import UserRepository from '../services/user/user.repository';
import { generateRefreshToken, generateToken } from '../../lib';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

const userRepository = new UserRepository();

export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, deviceId, fcmToken } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is not provided',
      user: null,
      token: null,
    });
  }

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      message: 'FCM token is not provided',
      user: null,
      token: null,
    });
  }

  const user = await userRepository.authenticateUser(email, password, deviceId, fcmToken);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid login credentials',
      user: null,
      token: null,
    });
  }

  const accessToken = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Calculate token expiration time from JWT
  const decodedToken = jwt.decode(accessToken) as { exp?: number } | null;
  const tokenExpiresAt = decodedToken?.exp 
    ? new Date(decodedToken.exp * 1000) 
    : new Date(Date.now() + 3600 * 1000); // Default to 1 hour if can't decode

  // Save accessToken to database with prefix "mobile-access-token:"
  await userRepository.updateUserToken(user.id.toString(), `mobile-access-token:${accessToken}`, tokenExpiresAt);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user,
    token: {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  });
});

export const refreshAccessToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
  }

  try {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      throw new AppError('JWT_SECRET must be set in environment variables', 500, 'CONFIGURATION_ERROR');
    }
    const decoded = jwt.verify(token, secretKey);
    const user = await userRepository.validateRefreshToken(decoded['email']);

    if (!user) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    const accessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid refresh token', 403, 'INVALID_TOKEN');
    }
    throw new AppError('Error refreshing access token', 500, 'TOKEN_REFRESH_ERROR');
  }
});

export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await userRepository.getUsers({});

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    users,
  });
});

export const getStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const students = await userRepository.getStudents({});

  res.status(200).json({
    success: true,
    message: 'Students fetched successfully',
    users: students,
  });
});

export const getUserByToken = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.params;

  if (!token) {
    throw new AppError('Token parameter is required', 400, 'VALIDATION_ERROR');
  }

  const user = await userRepository.getUserByToken(token);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No user found with the provided token',
      user: null,
    });
  }

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    user,
  });
});

export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new AppError('User ID is required', 400, 'VALIDATION_ERROR');
  }

  const user = await userRepository.getUserById(id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No user found with the provided ID',
      user: null,
    });
  }

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    user,
  });
});

export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userData = req.body;

  if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
    throw new AppError(
      'Email, password, firstName, and lastName are required',
      400,
      'VALIDATION_ERROR'
    );
  }

  if (!userData.deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is not provided',
      user: null,
      token: null,
    });
  }

  if (!userData.fcmToken) {
    return res.status(400).json({
      success: false,
      message: 'FCM token is not provided',
      user: null,
      token: null,
    });
  }

  const newUser = await userRepository.createUser(userData, userData.deviceId, userData.fcmToken);

  const accessToken = generateToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    user: newUser,
    token: {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updateUserData = req.body;

  if (!id) {
    throw new AppError('User ID is required', 400, 'VALIDATION_ERROR');
  }

  const existingUser = await userRepository.getUserById(id);

  if (!existingUser) {
    return res.status(404).json({
      success: false,
      message: 'No user found with the provided ID',
      user: null,
    });
  }

  const user = await userRepository.updateUserById(id, updateUserData);

  res.status(200).json({
    success: true,
    message: 'User successfully updated',
    user,
  });
});

export const getStudentsInCourseActivity = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { courseId, activityId } = req.params;

    if (!courseId || !activityId) {
      throw new AppError('Course ID and Activity ID are required', 400, 'VALIDATION_ERROR');
    }

    const students = await userRepository.getStudentsInCourseActivity(courseId, activityId);

    res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      users: students,
    });
  }
);

export const getStudentInCourseActivity = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { userId, activityId } = req.params;

    if (!userId || !activityId) {
      throw new AppError('User ID and Activity ID are required', 400, 'VALIDATION_ERROR');
    }

    const student = await userRepository.getStudentInCourseActivity(activityId, userId);

    res.status(200).json({
      success: true,
      message: 'Student fetched successfully',
      user: student,
    });
  }
);

export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  res.status(200).json({
    success: true,
    message: 'Current user fetched successfully',
    user: req.user,
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
  }

  // Get the current token from the database
  const user = await userRepository.getUserById(req.user.id.toString());
  
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Get client type from request header
  const clientType = req.headers['x-client-type'] as string; // 'mobile' or 'web'

  // Logic:
  // - Mobile can only clear tokens that start with "mobile-access-token:"
  // - Frontend/web can only clear tokens that do NOT start with "mobile-access-token:"
  if (user.token) {
    const isMobileToken = user.token.startsWith('mobile-access-token:');
    
    let shouldClear = false;
    
    if (clientType === 'mobile') {
      // Mobile client: only clear if token starts with "mobile-access-token:"
      shouldClear = isMobileToken;
    } else if (clientType === 'web') {
      // Frontend/web client: only clear if token does NOT start with "mobile-access-token:"
      shouldClear = !isMobileToken;
    } else {
      // No client type header provided - for backward compatibility, clear any token
      // (this allows existing code to work, but it's better to specify client type)
      shouldClear = true;
    }
    
    if (shouldClear) {
      // Clear token and tokenExpiresAt from database
      await userRepository.clearUserToken(req.user.id.toString());
    }
  }

  res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

