import { Response } from 'express';
import { z } from 'zod';

/**
 * Transforms Zod validation errors into the standardized error JSON shape
 * { error: { code: 'VALIDATION_ERROR', message: '...', fields: { ... } } }
 */
export const handleZodError = (res: Response, error: z.ZodError) => {
  const fields: Record<string, string> = {};
  
  error.issues.forEach((issue) => {
    // Standard path format is e.g. "email" or "dimensions"
    const fieldName = issue.path.join('.');
    fields[fieldName] = issue.message;
  });

  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fields
    }
  });
};
