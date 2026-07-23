import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protect all routes with JWT authentication
router.use(authenticateToken);

// GET /api/hs-codes/:code (spot check HS Code Reference + Duty Rates)
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.replace(/\s+/g, ''); // strip spacing
    if (!code) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'HS Code parameter is required'
        }
      });
    }

    const hsCodeRef = await prisma.hSCodeReference.findUnique({
      where: { hs_code: code }
    });

    if (!hsCodeRef) {
      return res.status(404).json({
        error: {
          code: 'HS_CODE_NOT_FOUND',
          message: `HS Code "${code}" was not found in the reference tables`
        }
      });
    }

    const dutyRates = await prisma.dutyRate.findMany({
      where: { hs_code: code }
    });

    return res.status(200).json({
      ...hsCodeRef,
      duty_rates: dutyRates
    });
  } catch (err) {
    console.error('Fetch HS Code error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected database error occurred'
      }
    });
  }
});

export default router;
