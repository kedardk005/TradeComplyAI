import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';
import { handleZodError } from '../utils/errors';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  name: z.string().min(1, { message: 'Name is required' }).optional()
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format' }),
  password: z.string().min(1, { message: 'Password is required' })
});

// JWT generation helper
const generateToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret_dev';
  return jwt.sign({ userId }, secret, { expiresIn: '24h' });
};


// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return handleZodError(res, parseResult.error);
    }

    const { email, password, name } = parseResult.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'A user with this email address already exists'
        }
      });
    }

    // Hash password with bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        name
      }
    });

    // Generate JWT
    const token = generateToken(user.id);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred during registration'
      }
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return handleZodError(res, parseResult.error);
    }

    const { email, password } = parseResult.data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Validate password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate JWT
    const token = generateToken(user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred during login'
      }
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication session is invalid'
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The requested user profile was not found'
        }
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      }
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred'
      }
    });
  }
});

export default router;
