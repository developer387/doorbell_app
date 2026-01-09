/**
 * Production-Grade Call Service
 * Handles all call operations with fault tolerance and security
 */

import { AgoraToken, CallError, CallPermissions } from '../../domain/call/types';

export interface TokenRequest {
  readonly requestId: string;
  readonly role: 'host' | 'audience';
  readonly uid?: number;
}

export interface TokenResponse {
  readonly token: string;
  readonly channelName: string;
  readonly uid: number;
  readonly expiresAt: number;
  readonly role: 'host' | 'audience';
}

export class CallService {
  private readonly baseUrl: string;
  private readonly timeout: number = 10000; // 10 seconds

  constructor(baseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Request secure Agora token from server
   * CRITICAL: Never generate tokens client-side
   */
  public async requestToken(request: TokenRequest): Promise<AgoraToken> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/agora/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
      }

      const data: TokenResponse = await response.json();
      
      // Validate response
      this.validateTokenResponse(data);

      return {
        token: data.token,
        channelName: data.channelName,
        uid: data.uid,
        expiresAt: data.expiresAt,
        role: data.role,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        throw this.createCallError('TOKEN_TIMEOUT', 'Token request timed out', true);
      }
      
      throw this.createCallError(
        'TOKEN_REQUEST_FAILED',
        error && typeof error === 'object' && 'message' in error 
          ? (error as Error).message 
          : 'Unknown token request error',
        true
      );
    }
  }

  /**
   * Verify and request device permissions
   */
  public async requestPermissions(): Promise<CallPermissions> {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Test that we actually got the permissions
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      const permissions: CallPermissions = {
        camera: videoTracks.length > 0 && videoTracks[0].readyState === 'live',
        microphone: audioTracks.length > 0 && audioTracks[0].readyState === 'live',
        verified: true,
      };

      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());

      if (!permissions.camera || !permissions.microphone) {
        throw this.createCallError(
          'PERMISSIONS_DENIED',
          'Camera and microphone permissions are required',
          false
        );
      }

      return permissions;
    } catch (error) {
      if (error instanceof CallError) {
        throw error;
      }

      throw this.createCallError(
        'PERMISSIONS_ERROR',
        error && typeof error === 'object' && 'message' in error 
          ? (error as Error).message 
          : 'Permission request failed',
        true
      );
    }
  }

  /**
   * Notify server that call has started
   */
  public async notifyCallStarted(requestId: string, channelName: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/calls/started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          channelName,
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('Failed to notify call started:', response.status);
        // Non-critical error - don't throw
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Failed to notify call started:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Notify server that call has ended
   */
  public async notifyCallEnded(requestId: string, reason: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/calls/ended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          reason,
          timestamp: Date.now(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('Failed to notify call ended:', response.status);
        // Non-critical error - don't throw
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('Failed to notify call ended:', error);
      // Non-critical error - don't throw
    }
  }

  private validateTokenResponse(data: any): asserts data is TokenResponse {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid token response format');
    }

    if (!data.token || typeof data.token !== 'string') {
      throw new Error('Invalid token in response');
    }

    if (!data.channelName || typeof data.channelName !== 'string') {
      throw new Error('Invalid channel name in response');
    }

    if (!data.uid || typeof data.uid !== 'number') {
      throw new Error('Invalid UID in response');
    }

    if (!data.expiresAt || typeof data.expiresAt !== 'number') {
      throw new Error('Invalid expiration time in response');
    }

    if (data.expiresAt <= Date.now()) {
      throw new Error('Token is already expired');
    }

    if (!data.role || !['host', 'audience'].includes(data.role)) {
      throw new Error('Invalid role in response');
    }
  }

  private createCallError(code: string, message: string, recoverable: boolean): CallError {
    return {
      code,
      message,
      recoverable,
      timestamp: Date.now(),
    };
  }
}