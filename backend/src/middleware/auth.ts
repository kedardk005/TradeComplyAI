import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface TokenPayload {
  userId: number;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token is missing'
      }
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_dev';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: err.name === 'TokenExpiredError' 
            ? 'Access token has expired' 
            : 'Access token is invalid'
        }
      });
    }

    const payload = decoded as TokenPayload;
    
    if (!payload || typeof payload.userId !== 'number') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Malformed token payload'
        }
      });
    }

    req.user = { userId: payload.userId };
    next();
  });
}
