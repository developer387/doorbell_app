export type SeamCapability = 'access_code' | 'lock';

export interface SeamLocation {
  location_name: string;
  timezone: string;
}

export interface SeamDeviceProperties {
  accessory_keypad: Record<string, unknown>;
  appearance: Record<string, unknown>;
  august_metadata: Record<string, unknown>;
  battery: Record<string, unknown>;
  battery_level: number;
  code_constraints: unknown[];
  door_open: boolean;
  has_native_entry_events: boolean;
  image_alt_text: string;
  image_url: string;
  keypad_battery: Record<string, unknown>;
  locked: boolean;
  manufacturer: string;
  model: Record<string, unknown>;
  name: string;
  offline_access_codes_enabled: boolean;
  online: boolean;
  online_access_codes_enabled: boolean;
  serial_number: string;
  supported_code_lengths: number[];
  supports_accessory_keypad: boolean;
  supports_backup_access_code_pool: boolean;
  supports_offline_access_codes: boolean;
}

export interface SeamDevice {
  can_program_online_access_codes: boolean;
  can_remotely_lock: boolean;
  can_remotely_unlock: boolean;
  can_simulate_connection: boolean;
  can_simulate_disconnection: boolean;
  can_simulate_hub_connection: boolean;
  can_simulate_hub_disconnection: boolean;
  can_simulate_removal: boolean;
  can_unlock_with_code: boolean;

  capabilities_supported: SeamCapability[];

  connected_account_id: string;
  created_at: string;

  custom_metadata: Record<string, unknown>;

  device_id: string;
  device_type: string;
  display_name: string;

  errors: unknown[];
  warnings: unknown[];

  is_managed: boolean;

  location: SeamLocation;

  nickname: string;

  properties: SeamDeviceProperties;

  space_ids: string[];

  workspace_id: string;
}
