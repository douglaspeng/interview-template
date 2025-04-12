/**
 * Chat-specific utility functions
 */

/**
 * Gets the most recent user message from an array of messages
 */
export function getMostRecentUserMessage(messages: any[]): any {
  if (!messages || messages.length === 0) return null;
  
  // Find the most recent user message
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i];
    }
  }
  
  return null;
}

/**
 * Sanitizes response messages by removing the 'id' property
 */
export function sanitizeResponseMessages(messages: any[]): any[] {
  return messages.map(msg => {
    // Create a new object without the 'id' property
    const { id, ...rest } = msg;
    return rest;
  });
} 