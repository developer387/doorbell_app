import { Seam } from 'seam';
import { type SeamDevice } from '@/types';

const SEAM_API_KEY = (process.env.EXPO_PUBLIC_SEAM_API_KEY as string) ?? '';

export interface SeamBrand {
  key: string;
  name: string;
  display_name: string;
  icon_url?: string;
}

export interface ConnectWebview {
  connect_webview_id: string;
  url: string;
  status: 'pending' | 'authorized' | 'failed';
}

export interface ConnectedAccount {
  connected_account_id: string;
  created_at: string;
  user_identifier?: {
    email?: string;
    phone?: string;
  };
}

export interface Lock {
  device_id: string;
  device_type: string;
  display_name: string;
  manufacturer?: string;
  properties?: {
    name?: string;
    manufacturer?: string;
    model?: {
      display_name?: string;
    };
    online?: boolean;
    locked?: boolean;
  };
  connected_account_id?: string;
}

export interface AccessCodeResponse {
  code: string;
  expiresAt: number;
}

class SeamService {
  private client: Seam | null = null;

  constructor() {
    if (!SEAM_API_KEY) {
      console.warn(
        'Seam API key is not set. Please add EXPO_PUBLIC_SEAM_API_KEY to your .env file'
      );
      return;
    }

    if (!SEAM_API_KEY.startsWith('seam_')) {
      console.error('Invalid Seam API key format. API key should start with "seam_"');
      return;
    }

    try {
      this.client = new Seam(SEAM_API_KEY);
    } catch (error) {
      console.error('Failed to initialize Seam client:', error);
    }
  }

  private getClient(): Seam {
    if (!this.client) {
      throw new Error('Seam client not initialized. Please check your API key configuration.');
    }
    return this.client;
  }

  async getDeviceProviders(): Promise<SeamDevice[]> {
    const client = this.getClient();
    const response = await client.devices.list();
    return response as unknown as SeamDevice[];
  }

  async getBrandProviders(): Promise<SeamBrand[]> {
    const client = this.getClient();

    try {
      const providers = await client.devices.listDeviceProviders();
      console.log('Fetched brand providers:', providers.length);

      return providers.map((provider) => ({
        key: provider.device_provider_name,
        name: provider.device_provider_name,
        display_name: provider.display_name || provider.device_provider_name,
        icon_url: provider.image_url,
      }));
    } catch (error) {
      console.error('Error fetching brand providers:', error);
      throw error;
    }
  }

  async createConnectWebview(providerKey?: string): Promise<ConnectWebview> {
    const client = this.getClient();

    try {
      const params = providerKey ? { accepted_providers: [providerKey] as any[] } : {};

      const webview = await client.connectWebviews.create(params);
      console.log('Seam connect webview created:', webview.connect_webview_id);

      return {
        connect_webview_id: webview.connect_webview_id,
        url: webview.url,
        status: webview.status,
      };
    } catch (error) {
      console.error('Error creating Seam connect webview:', error);
      throw error;
    }
  }

  async getConnectWebviewStatus(webviewId: string): Promise<ConnectWebview> {
    const client = this.getClient();

    try {
      const webview = await client.connectWebviews.get({
        connect_webview_id: webviewId,
      });

      return {
        connect_webview_id: webview.connect_webview_id,
        url: webview.url,
        status: webview.status,
      };
    } catch (error) {
      console.error('Error getting webview status:', error);
      throw error;
    }
  }

  async getDevices(connectedAccountId?: string): Promise<Lock[]> {
    const client = this.getClient();

    try {
      const params = connectedAccountId
        ? { connected_account_id: connectedAccountId }
        : {};

      const devices = await client.devices.list(params);
      console.log('Fetched devices:', devices.length);

      return devices
        .filter((device) => device.device_type?.includes('lock'))
        .map((device) => ({
          device_id: device.device_id,
          device_type: device.device_type,
          display_name: device.properties?.name || device.display_name || 'Unnamed Lock',
          manufacturer: device.properties?.manufacturer || (device as any).manufacturer,
          properties: device.properties as Lock['properties'],
          connected_account_id: device.connected_account_id,
        }));
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  async unlockDoor(deviceId: string): Promise<void> {
    const client = this.getClient();

    try {
      await client.locks.unlockDoor({ device_id: deviceId });
      console.log('Door unlocked successfully:', deviceId);
    } catch (error) {
      console.error('Error unlocking door:', error);
      throw error;
    }
  }

  async lockDoor(deviceId: string): Promise<void> {
    const client = this.getClient();

    try {
      await client.locks.lockDoor({ device_id: deviceId });
      console.log('Door locked successfully:', deviceId);
    } catch (error) {
      console.error('Error locking door:', error);
      throw error;
    }
  }

  async createAccessCode(
    deviceId: string,
    duration: number,
    unit: 'minutes' | 'hours'
  ): Promise<AccessCodeResponse> {
    const client = this.getClient();

    try {
      const now = new Date();
      const startsAt = now.toISOString();
      const endsAt = new Date(
        now.getTime() + duration * (unit === 'hours' ? 60 * 60 * 1000 : 60 * 1000)
      ).toISOString();

      const accessCode = await client.accessCodes.create({
        device_id: deviceId,
        name: `Temporary Access - ${now.toLocaleString()}`,
        starts_at: startsAt,
        ends_at: endsAt,
      });

      console.log('Access code created:', accessCode.access_code_id);

      return {
        code: accessCode.code || '',
        expiresAt: new Date(endsAt).getTime(),
      };
    } catch (error) {
      console.error('Error creating access code:', error);
      throw error;
    }
  }

  async deleteAccessCode(accessCodeId: string): Promise<void> {
    const client = this.getClient();

    try {
      await client.accessCodes.delete({ access_code_id: accessCodeId });
      console.log('Access code deleted:', accessCodeId);
    } catch (error) {
      console.error('Error deleting access code:', error);
      throw error;
    }
  }
}

export const seamService = new SeamService();
