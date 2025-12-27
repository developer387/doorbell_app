import { collection, query, where, getDocs, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Property } from '@/types/Property';

export class PropertyService {
    /**
     * Find a property by its QR code UUID
     * @param qrCodeUUID The UUID from the scanned QR code
     * @returns The property if found, null otherwise
     */
    static async findByQRCodeUUID(qrCodeUUID: string): Promise<Property | null> {
        try {
            const propertiesRef = collection(db, 'properties');

            // Construct the URL if it's not already one
            const rawUuid = qrCodeUUID.trim();
            const url = rawUuid.includes('doorbell.guestregistration.com')
                ? rawUuid
                : `https://doorbell.guestregistration.com/${rawUuid}`;

            // Search for *either* the UUID or the URL to be safe/backward compatible
            // If the DB has just UUID, we find it. If it has URL, we find it.
            // Note: If rawUuid is already a URL, the array will have duplicates, which is fine.
            const searchValues = [rawUuid];
            if (rawUuid !== url) {
                searchValues.push(url);
            }

            const q = query(propertiesRef, where('qrCodeUUID', 'in', searchValues));
            const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);

            if (querySnapshot.empty) {
                return null;
            }

            // Get the first matching document
            const doc = querySnapshot.docs[0];
            const data = doc.data();

            return {
                ...data,
                id: doc.id,
            } as Property;
        } catch (error) {
            console.error('Error finding property by QR code UUID:', error);
            throw error;
        }
    }
}
