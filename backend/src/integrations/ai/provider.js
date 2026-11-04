/**
 * AI Provider Base Interface
 */
export class AIProvider {
  /**
   * Process user input and return structured intent and tool parameters
   * @param {string} prompt
   * @param {Object} context - { user, workspace, clients, availableTools }
   * @returns {Promise<{ intent: string, message: string, missingFields?: string[], draft?: any, toolCall?: any }>}
   */
  async processQuery(prompt, context) {
    throw new Error('processQuery() not implemented');
  }
}
