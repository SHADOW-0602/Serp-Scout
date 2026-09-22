import { createDb } from '@serp-scout/db';
import { env } from '../config/env.js';

export const db = createDb(env.DATABASE_URL);
export * from '@serp-scout/db';
