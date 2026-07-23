import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';
import { handleZodError } from '../utils/errors';

const router = Router();

// Validation Schemas
const productCreateSchema = z.object({
  name: z.string().min(1, { message: 'Name cannot be empty' }),
  description: z.string().min(1, { message: 'Description cannot be empty' }),
  category: z.string().min(1, { message: 'Category cannot be empty' }),
  weight: z.number().positive({ message: 'Weight must be a positive number' }),
  dimensions: z.string().min(1, { message: 'Dimensions cannot be empty' }),
  declared_value: z.number().positive({ message: 'Declared value must be a positive number' }),
  origin_country: z.string().min(1, { message: 'Origin country cannot be empty' }),
  images: z.array(z.string()).optional()
});

const productUpdateSchema = productCreateSchema.partial();

// All routes are protected by default
router.use(authenticateToken);

// GET /api/products (List products owned by authenticated user)
router.get('/', async (req: Request, res: Response) => {
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

    // Query params
    const category = req.query.category as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ProductWhereInput = {
      user_id: userId
    };

    if (category) {
      whereClause.category = category;
    }

    // Parallel counts and fetch
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.product.count({ where: whereClause })
    ]);

    return res.status(200).json({
      products,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('List products error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred'
      }
    });
  }
});

// POST /api/products (Create a product)
router.post('/', async (req: Request, res: Response) => {
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

    const parseResult = productCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return handleZodError(res, parseResult.error);
    }

    const {
      name,
      description,
      category,
      weight,
      dimensions,
      declared_value,
      origin_country,
      images
    } = parseResult.data;

    // Create the product
    const product = await prisma.product.create({
      data: {
        user_id: userId,
        name,
        description,
        category,
        weight,
        dimensions,
        declared_value: new Prisma.Decimal(declared_value),
        origin_country,
        images: images || []
      }
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred while creating the product'
      }
    });
  }
});

// GET /api/products/:id (Get single product owned by user)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const productId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication session is invalid'
        }
      });
    }

    if (isNaN(productId)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    // Scoping check: Return 404 (not 403) to hide existence of other users' products
    if (!product || product.user_id !== userId) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error('Get product error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred'
      }
    });
  }
});

// PUT /api/products/:id (Update product details)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const productId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication session is invalid'
        }
      });
    }

    if (isNaN(productId)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    const parseResult = productUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return handleZodError(res, parseResult.error);
    }

    // Verify product ownership before updating
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct || existingProduct.user_id !== userId) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    // Format update payload
    const updateData: any = { ...parseResult.data };
    if (parseResult.data.declared_value !== undefined) {
      updateData.declared_value = new Prisma.Decimal(parseResult.data.declared_value);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData
    });

    return res.status(200).json(updatedProduct);
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred while updating the product'
      }
    });
  }
});

// DELETE /api/products/:id (Delete product)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const productId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication session is invalid'
        }
      });
    }

    if (isNaN(productId)) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    // Verify product ownership before deleting
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct || existingProduct.user_id !== userId) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'The requested product was not found'
        }
      });
    }

    await prisma.product.delete({
      where: { id: productId }
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred while deleting the product'
      }
    });
  }
});

export default router;
