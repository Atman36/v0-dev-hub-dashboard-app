import { z } from 'zod';
import { getSafeExternalUrl } from './utils.ts';

export const optionalUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (!value) return true;
      return getSafeExternalUrl(value) !== null;
    },
    { message: 'Please enter a valid HTTP or HTTPS URL' }
  );
