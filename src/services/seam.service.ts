import { Seam } from 'seam';
import { SeamDevice } from '@/types';

const SEAM_API_KEY = process.env.EXPO_PUBLIC_SEAM_API_KEY || '';

export interface SeamBrand {
  key: string;
  name: string;
  display_name: string;
  icon_url?: string;
}

export interface ConnectWebview {
  connect_webview_id: string;
  url: string;
  status: string;
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

class SeamService {
  private client: Seam | null = null;

  constructor() {
    // Validate API key format
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

  async getDeviceProviders(): Promise<SeamDevice[]> {
    if (!this.client) {
      throw new Error('Seam client not initialized');
    }

    const response = await this.client.devices.list();

    return response as SeamDevice[];
  }

  async getBrandProviders(): Promise<SeamBrand[]> {
    if (!this.client) {
      throw new Error('Seam client not initialized');
    }

    try {
      const providers = await this.client.devices.listDeviceProviders();
      console.log('Fetched brand providers:', providers);

      return providers.map((provider: any) => ({
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
    if (!this.client) {
      throw new Error('Seam client not initialized. Please check your API key configuration.');
    }

    try {
      const params: any = {
        accepted_providers: providerKey ? [providerKey] : undefined,
      };

      const webview = await this.client.connectWebviews.create(params);
      console.log('Seam connect webview created:', webview);

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
    if (!this.client) {
      throw new Error('Seam client not initialized.');
    }

    try {
      const webview = await this.client.connectWebviews.get({
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
    if (!this.client) {
      throw new Error('Seam client not initialized.');
    }

    try {
      const params: any = connectedAccountId
        ? { connected_account_id: connectedAccountId }
        : {};

      const devices = await this.client.devices.list(params);
      console.log('Fetched devices:', devices);

      return devices
        .filter((device: any) => device.device_type?.includes('lock'))
        .map((device: any) => ({
          device_id: device.device_id,
          device_type: device.device_type,
          display_name: device.properties?.name || device.display_name || 'Unnamed Lock',
          manufacturer: device.properties?.manufacturer || device.manufacturer,
          properties: device.properties,
          connected_account_id: device.connected_account_id,
        }));
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }
}

export const seamService = new SeamService();
