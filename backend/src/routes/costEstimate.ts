import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';
import { calculateShipmentCost } from '../services/costEstimator';

const router = Router();

// Helper to assert product ownership scope
async function verifyProductOwnership(productId: number, userId: number) {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  if (!product) return null;
  if (product.user_id !== userId) return null;
  return product;
}

// POST /api/cost-estimate
// Computes and persists a landed cost estimate for a product
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { productId, mode } = req.body;

    if (!productId || !mode) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'productId and mode (air | sea) parameters are required'
        }
      });
    }

    if (mode !== 'air' && mode !== 'sea') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: "Mode must be either 'air' or 'sea'"
        }
      });
    }

    const pId = parseInt(productId, 10);
    if (isNaN(pId)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid product ID parameter'
        }
      });
    }

    // 1. Verify product ownership
    const product = await verifyProductOwnership(pId, userId);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or you are not authorized to access it'
        }
      });
    }

    // 2. Fetch the latest classification for the product
    const latestClassification = await prisma.classification.findFirst({
      where: { product_id: product.id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestClassification) {
      return res.status(400).json({
        error: {
          code: 'CLASSIFICATION_REQUIRED',
          message: 'This product has not been classified yet. Please run HS classification first.'
        }
      });
    }

    // Select the confirmed HS code if overridden, otherwise the AI suggested one
    const activeHsCode = latestClassification.confirmed_hs_code || latestClassification.hs_code;

    // 3. Lookup DutyRate from the USITC reference database
    // All TradeComplyAI corridor shipments target the US
    let dutyRateRecord = await prisma.dutyRate.findFirst({
      where: {
        hs_code: activeHsCode,
        destination_country: 'US'
      }
    });

    // Fallback: search for parent codes by truncating sub-levels (e.g. from 6109.10.00.04 -> 6109.10.00 -> 6109.10 -> 6109)
    if (!dutyRateRecord) {
      const cleanCode = activeHsCode.replace(/\./g, '').trim(); // Remove dots for prefix matching
      const prefixLengths = [8, 6, 4];
      
      for (const len of prefixLengths) {
        if (cleanCode.length >= len) {
          const prefix = cleanCode.substring(0, len);
          
          // Match codes starting with the prefix (e.g. "6109.10" matches "610910")
          // Since reference codes contain dots, format the query or match dynamically
          const formattedPrefix = len === 4 
            ? prefix 
            : len === 6 
              ? `${prefix.substring(0, 4)}.${prefix.substring(4, 6)}`
              : `${prefix.substring(0, 4)}.${prefix.substring(4, 6)}.${prefix.substring(6, 8)}`;

          dutyRateRecord = await prisma.dutyRate.findFirst({
            where: {
              hs_code: { startsWith: formattedPrefix },
              destination_country: 'US'
            }
          });

          if (dutyRateRecord) {
            console.log(`Fallback Match: Found duty rate for prefix ${formattedPrefix} matching original code ${activeHsCode}`);
            break;
          }
        }
      }
    }

    if (!dutyRateRecord) {
      return res.status(404).json({
        error: {
          code: 'DUTY_RATE_NOT_FOUND',
          message: `Duty rate reference not found for HTS Code '${activeHsCode}' in US ITC tables.`
        }
      });
    }

    // 4. Lookup FreightRate matching the origin -> destination corridor and shipping mode
    const destinationCountry = 'US';
    const freightRateRecord = await prisma.freightRate.findFirst({
      where: {
        origin_country: product.origin_country,
        destination_country: destinationCountry,
        mode: mode
      }
    });

    if (!freightRateRecord) {
      return res.status(404).json({
        error: {
          code: 'FREIGHT_RATE_NOT_CONFIGURED',
          message: `Freight rates are not configured for shipping from ${product.origin_country} to ${destinationCountry} via ${mode}.`
        }
      });
    }

    // 5. Execute calculations using our deterministic costEstimator service
    let estimationResult;
    try {
      estimationResult = calculateShipmentCost({
        declaredValue: Number(product.declared_value),
        weight: product.weight,
        hsCode: activeHsCode,
        dutyRate: dutyRateRecord.duty_rate,
        freightRatePerKg: Number(freightRateRecord.rate_per_kg),
        freightMinCharge: Number(freightRateRecord.min_charge)
      });
    } catch (parseErr: any) {
      return res.status(422).json({
        error: {
          code: 'UNPARSEABLE_TARIFF_RATE',
          message: `Failed to calculate landed cost: ${parseErr.message}`
        }
      });
    }

    // 6. Persist estimation results to the database
    // RATIONALE: Persisting estimates ensures audit compliance (snapshotting duty and freight rates
    // active at transaction time) and supports immediate frontend retrieval without re-running parsing.
    const savedEstimate = await prisma.costEstimate.create({
      data: {
        product_id: product.id,
        mode: mode,
        declared_value: product.declared_value,
        duty_amount: new Prisma.Decimal(estimationResult.dutyAmount),
        mpf_amount: new Prisma.Decimal(estimationResult.mpfAmount),
        freight_cost: new Prisma.Decimal(estimationResult.freightCost),
        insurance_cost: new Prisma.Decimal(estimationResult.insuranceCost),
        total_landed_cost: new Prisma.Decimal(estimationResult.totalLandedCost),
        breakdown: estimationResult.breakdown
      }
    });

    return res.status(200).json(savedEstimate);
  } catch (err: any) {
    console.error('Landed cost estimation trigger error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during cost estimation'
      }
    });
  }
});

// GET /api/cost-estimate/:productId
// Fetches the latest saved cost estimate for a product
router.get('/:productId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const productId = parseInt(req.params.productId, 10);

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

    const latestEstimate = await prisma.costEstimate.findFirst({
      where: { product_id: product.id },
      orderBy: { created_at: 'desc' }
    });

    if (!latestEstimate) {
      return res.status(404).json({
        error: {
          code: 'ESTIMATE_NOT_FOUND',
          message: 'No previous cost estimate has been computed for this product.'
        }
      });
    }

    return res.status(200).json(latestEstimate);
  } catch (err: any) {
    console.error('Fetch cost estimate error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during estimate retrieval'
      }
    });
  }
});

export default router;
