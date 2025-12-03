import { Seam } from 'seam';

const SEAM_API_KEY = process.env.EXPO_PUBLIC_SEAM_API_KEY || '';

export interface SeamDevice {
  device_id: string;
  device_type: string;
  manufacturer: string;
  display_name?: string;
  properties?: {
    manufacturer?: string;
    name?: string;
    model?: {
      display_name?: string;
    };
  };
}

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

  async getDeviceProviders(): Promise<SeamBrand[]> {
    // Return default brands if client is not initialized
    const defaultBrands: SeamBrand[] = [
      { key: 'august', name: 'August', display_name: 'August' },
      { key: 'yale', name: 'Yale', display_name: 'Yale' },
      { key: 'schlage', name: 'Schlage', display_name: 'Schlage' },
      { key: 'kwikset', name: 'Kwikset', display_name: 'Kwikset' },
      { key: 'igloohome', name: 'Igloohome', display_name: 'Igloohome' },
      { key: 'ttlock', name: 'TTLock', display_name: 'TTLock' },
      { key: 'noiseaware', name: 'Noiseaware', display_name: 'Noiseaware' },
      { key: 'my2n', name: 'My2N', display_name: 'My2N' },
      { key: 'minut', name: 'Minut', display_name: 'Minut' },
    ];

    if (!this.client) {
      console.warn('Seam client not initialized. Returning default brands.');
      return defaultBrands;
    }

    try {
      const response = await this.client.devices.list();
      console.log('Seam devices response:', response);

      // Extract unique manufacturers/brands from devices
      const brandsMap = new Map<string, SeamBrand>();

      if (Array.isArray(response)) {
        response.forEach((device: any) => {
          const manufacturer = device.properties?.manufacturer || device.manufacturer || 'Unknown';
          if (!brandsMap.has(manufacturer)) {
            brandsMap.set(manufacturer, {
              key: manufacturer.toLowerCase().replace(/\s+/g, '_'),
              name: manufacturer,
              display_name: manufacturer,
            });
          }
        });
      }

      // If no devices found, return default list
      if (brandsMap.size === 0) {
        return defaultBrands;
      }

      return Array.from(brandsMap.values());
    } catch (error) {
      console.error('Error fetching Seam device providers:', error);
      return defaultBrands;
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
}

export const seamService = new SeamService();
