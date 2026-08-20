import { IntentResult } from '../router/intent.schemas';

export interface AIProvider {
  /**
   * Parses the user's raw message and returns a strictly typed
   * intent classification result.
   */
  classifyIntent(message: string): Promise<IntentResult>;
}
