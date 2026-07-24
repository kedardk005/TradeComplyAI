import { Router, Request, Response } from 'express';
import prisma from '../config/db';
import { authenticateToken } from '../middleware/auth';
import http from 'http';

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

// Helper to invoke Python FastAPI readiness-check microservice
function callFastApiReadiness(description: string, category: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ description, category });
    
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 8000,
        path: '/readiness-check',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`FastAPI readiness returned status ${res.statusCode}: ${body}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// GET /api/products/:id/readiness
// Fetches U.S. compliance requirements: either hand-verified or AI-assisted unverified regulations
router.get('/:id/readiness', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const productId = parseInt(req.params.id, 10);

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

    const categoryNorm = product.category.toLowerCase().trim();
    let dbCategory = '';

    // Normalizing category strings to align with database seeds
    if (categoryNorm === 'textiles') dbCategory = 'Textiles';
    else if (categoryNorm === 'spices') dbCategory = 'Spices';
    else if (categoryNorm === 'handicrafts') dbCategory = 'Handicrafts';
    else if (categoryNorm === 'leather') dbCategory = 'Leather';
    else if (categoryNorm === 'pharma/cosmetics' || categoryNorm === 'pharma' || categoryNorm === 'cosmetics') {
      dbCategory = 'Pharma/Cosmetics';
    } else if (categoryNorm === 'jewelry' || categoryNorm === 'jewellery') {
      dbCategory = 'Jewelry';
    }

    if (dbCategory) {
      // Path 1: core category - return hand-verified regulations
      const rules = await prisma.readinessRule.findMany({
        where: {
          category: dbCategory,
          rule_type: 'hand_verified'
        }
      });
      return res.status(200).json({
        source: 'hand_verified',
        rules
      });
    } else {
      // Path 2: outside core 6 - fetch from AI microservice
      try {
        const aiRes = await callFastApiReadiness(product.description, product.category);
        const aiRules = aiRes.rules || [];
        
        const formattedRules = aiRules.map((r: any, idx: number) => ({
          id: `ai-rule-${idx}-${Date.now()}`,
          category: product.category,
          rule_type: 'ai_assisted',
          requirement: r.requirement,
          description: r.description,
          source: r.source,
          created_at: new Date()
        }));

        return res.status(200).json({
          source: 'ai_assisted',
          rules: formattedRules
        });
      } catch (aiErr: any) {
        console.error('FastAPI readiness call failed, falling back to static unverified rules:', aiErr);
        
        // Dynamic fallback list if Python service is offline
        const fallbackRules = [
          {
            id: `fallback-1-${Date.now()}`,
            category: product.category,
            rule_type: 'ai_assisted',
            requirement: 'General Import Documentation (CBP Form 7501)',
            description: 'Exporters must provide standard commercial invoices and packing lists. | NEEDS MANUAL VERIFICATION: check required documents before shipping',
            source: 'NEEDS MANUAL VERIFICATION: 19 CFR Part 142',
            created_at: new Date()
          },
          {
            id: `fallback-2-${Date.now()}`,
            category: product.category,
            rule_type: 'ai_assisted',
            requirement: 'Partner Government Agency (PGA) Clearances',
            description: 'Goods under this classification may be flagged for inspection by specific PGAs based on active HTS requirements. | NEEDS MANUAL VERIFICATION: verify specific PGA flags',
            source: 'NEEDS MANUAL VERIFICATION: CBP PGA Integration Guidelines',
            created_at: new Date()
          }
        ];

        return res.status(200).json({
          source: 'ai_assisted',
          rules: fallbackRules
        });
      }
    }
  } catch (err: any) {
    console.error('Fetch readiness compliance error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred during readiness checks'
      }
    });
  }
});

export default router;
