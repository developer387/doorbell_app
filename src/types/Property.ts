export interface Property {
  propertyId: string;
  category: string;
  propertyName: string | null;
  address: string | null;
  location: { latitude: number; longitude: number } | null;
  smartLocks: never;
  userId: string;
  createdAt: string;
}
