/**
 * Production-Grade Call Service
 * Simplified for ZegoCloud integration
 */

export class CallService {
  private readonly baseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  private readonly timeout: number = 10000;

  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  /**
   * Notify server that call has started
   */
  public async notifyCallStarted(requestId: string): Promise<void> {
    await this.post('/api/calls/started', {
      requestId,
      timestamp: Date.now()
    });
  }

  /**
   * Notify server that call has ended
   */
  public async notifyCallEnded(requestId: string, reason: string): Promise<void> {
    await this.post('/api/calls/ended', {
      requestId,
      reason,
      timestamp: Date.now()
    });
  }

  private async post(endpoint: string, body: any): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`API call to ${endpoint} failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`API call to ${endpoint} failed:`, error);
    }
  }
}