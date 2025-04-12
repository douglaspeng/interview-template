import { db } from './db';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}

export interface CachedPrompt {
  id: string;
  promptHash: string;
  prompt: string;
  result: string;
  tokenUsage: string;
  createdAt: Date;
  updatedAt: Date;
}

// Check if prompt cache is enabled
const isPromptCacheEnabled = process.env.ENABLE_PROMPT_CACHE !== 'false';

/**
 * Generate a hash for a prompt to use as a cache key
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

/**
 * Check if a prompt is cached and return the cached result if it exists
 */
export async function getCachedPrompt(prompt: string): Promise<CachedPrompt | null> {
  if (!isPromptCacheEnabled) {
    console.log('Prompt cache is disabled');
    return null;
  }

  try {
    const promptHash = hashPrompt(prompt);
    const stmt = db.$client.prepare('SELECT * FROM promptCache WHERE promptHash = ? LIMIT 1');
    const result = stmt.get(promptHash) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      updatedAt: new Date(result.updatedAt)
    };
  } catch (error) {
    console.error('Error getting cached prompt:', error);
    return null;
  }
}

/**
 * Save a prompt and its result to the cache
 */
export async function savePromptToCache(
  prompt: string, 
  result: string, 
  tokenUsage: TokenUsage
): Promise<void> {
  if (!isPromptCacheEnabled) {
    console.log('Prompt cache is disabled, not saving to cache');
    return;
  }

  try {
    const promptHash = hashPrompt(prompt);
    const now = new Date().getTime();
    
    // Check if the prompt is already in the cache
    const checkStmt = db.$client.prepare('SELECT id FROM promptCache WHERE promptHash = ? LIMIT 1');
    const existing = checkStmt.get(promptHash) as any;
    
    if (existing) {
      // Update the existing record
      const updateStmt = db.$client.prepare(`
        UPDATE promptCache 
        SET result = ?, tokenUsage = ?, updatedAt = ?
        WHERE promptHash = ?
      `);
      
      updateStmt.run(
        result,
        JSON.stringify(tokenUsage),
        now,
        promptHash
      );
      
      console.log(`Updated existing cache entry with hash: ${promptHash}`);
    } else {
      // Insert a new record
      const id = nanoid();
      const insertStmt = db.$client.prepare(`
        INSERT INTO promptCache (id, promptHash, prompt, result, tokenUsage, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        id,
        promptHash,
        prompt,
        result,
        JSON.stringify(tokenUsage),
        now,
        now
      );
      
      console.log(`Saved new prompt to cache with hash: ${promptHash}`);
    }
  } catch (error) {
    console.error('Error saving prompt to cache:', error);
  }
} 