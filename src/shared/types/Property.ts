export interface SmartLock {
  connected_account_id: string;
  device_id: string;
  device_type: string;
  display_name: string;
  manufacturer: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  [key: string]: string | number;
}

export interface Property {
  address: string;
  category: string;
  createdAt: string;
  location: Location;
  propertyId: string;
  propertyName: string;
  smartLocks: SmartLock[];
  userId: string;
  pinCode?: string;
  qrCodeUUID?: string; // UUID from QR code
  id?: string; // Firestore Document ID
  allowGuest?: boolean; // Controls guest access permission
}
