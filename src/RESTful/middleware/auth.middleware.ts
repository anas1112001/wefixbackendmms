import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../db/models/user.model';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      return res.status(500).json({ message: 'JWT_SECRET must be set in environment variables' });
    }
    const decoded = jwt.verify(token, secretKey);
    const userEmail = decoded['email'];

    const user = await User.findOne({ where: { email: userEmail } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Authentication failed', error: error.message });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
      return res.status(500).json({ message: 'JWT_SECRET must be set in environment variables' });
    }
    const decoded = jwt.verify(token, secretKey);
      const userEmail = decoded['email'];
      const user = await User.findOne({ where: { email: userEmail } });
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};


