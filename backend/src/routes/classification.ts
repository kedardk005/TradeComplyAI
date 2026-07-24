import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Helper to assert ownership scope
async function verifyProductOwnership(productId: number, userId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  if (!product) return null;
  if (product.user_id !== userId) return null;
  return product;
}

// POST /api/products/:id/classify
// Triggers the hybrid AI classifier pipeline
router.post('/:id/classify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const userId = (req as any).user.userId;

    if (isNaN(productId)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid product ID parameter'
        }
      });
    }

    const product = await verifyProductOwnership(productId, userId);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or you are not authorized to access it'
        }
      });
    }

    // Call Python FastAPI classification service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    
    let result;
    try {
      const response = await fetch(`${aiServiceUrl}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: product.description,
          category: product.category
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(502).json({
          error: {
            code: 'AI_SERVICE_ERROR',
            message: `FastAPI AI service responded with error status: ${response.status}. Details: ${errText}`
          }
        });
      }

      result = await response.json();
    } catch (fetchErr: any) {
      return res.status(503).json({
        error: {
          code: 'AI_SERVICE_UNAVAILABLE',
          message: `Failed to contact AI service at ${aiServiceUrl}: ${fetchErr.message}`
        }
      });
    }

    // Save classification record into PostgreSQL
    // Status is 'pending_review' if needs_review is flagged by AI, otherwise 'confirmed'
    const classification = await prisma.classification.create({
      data: {
        product_id: product.id,
        hs_code: result.hs_code,
        confidence: result.confidence,
        reasoning: result.reasoning,
        ai_candidates: result.candidates,
        status: result.needs_review ? 'pending_review' : 'confirmed'
      }
    });

    return res.status(200).json(classification);
  } catch (err: any) {
    console.error('Classification trigger error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during classification'
      }
    });
  }
});

// PUT /api/products/:id/classify/override
// Records human correction override datasets
router.put('/:id/classify/override', authenticateToken, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const userId = (req as any).user.userId;
    const { hs_code, reason } = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid product ID parameter'
        }
      });
    }

    if (!hs_code || typeof hs_code !== 'string') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'hs_code string parameter is required for overrides'
        }
      });
    }

    const product = await verifyProductOwnership(productId, userId);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or you are not authorized to access it'
        }
      });
    }

    // Fetch the latest classification record
    const latestClassification = await prisma.classification.findFirst({
      where: { product_id: product.id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestClassification) {
      return res.status(404).json({
        error: {
          code: 'CLASSIFICATION_NOT_FOUND',
          message: 'No prior AI classification record was found for this product. Run classification first.'
        }
      });
    }

    // Update the record to preserve original hs_code guess while applying human correction
    const updated = await prisma.classification.update({
      where: { id: latestClassification.id },
      data: {
        confirmed_hs_code: hs_code.trim(),
        status: 'overridden',
        reasoning: reason ? `${latestClassification.reasoning} | Override reason: ${reason}` : latestClassification.reasoning
      }
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('Classification override error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during override'
      }
    });
  }
});

// PUT /api/products/:id/classify/confirm
// Confirms the current AI suggestion as correct without changes
router.put('/:id/classify/confirm', authenticateToken, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const userId = (req as any).user.userId;

    if (isNaN(productId)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid product ID parameter'
        }
      });
    }

    const product = await verifyProductOwnership(productId, userId);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or you are not authorized to access it'
        }
      });
    }

    // Fetch the latest classification record
    const latestClassification = await prisma.classification.findFirst({
      where: { product_id: product.id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestClassification) {
      return res.status(404).json({
        error: {
          code: 'CLASSIFICATION_NOT_FOUND',
          message: 'No prior AI classification record was found. Run classification first.'
        }
      });
    }

    // Update status to confirmed, set confirmed_hs_code to the original AI suggestion
    const updated = await prisma.classification.update({
      where: { id: latestClassification.id },
      data: {
        status: 'confirmed',
        confirmed_hs_code: latestClassification.hs_code
      }
    });

    return res.status(200).json(updated);
  } catch (err: any) {
    console.error('Classification confirm error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during confirmation'
      }
    });
  }
});

// GET /api/products/:id/classify
// Fetches the active classification status for the frontend
router.get('/:id/classify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const userId = (req as any).user.userId;

    if (isNaN(productId)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid product ID parameter'
        }
      });
    }

    const product = await verifyProductOwnership(productId, userId);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or you are not authorized to access it'
        }
      });
    }

    const latestClassification = await prisma.classification.findFirst({
      where: { product_id: product.id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestClassification) {
      return res.status(404).json({
        error: {
          code: 'CLASSIFICATION_NOT_FOUND',
          message: 'No classification record exists for this product.'
        }
      });
    }

    return res.status(200).json(latestClassification);
  } catch (err: any) {
    console.error('Classification fetch error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during classification fetch'
      }
    });
  }
});

export default router;
