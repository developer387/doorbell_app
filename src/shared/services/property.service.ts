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
            const q = query(propertiesRef, where('qrCodeUUID', '==', qrCodeUUID));
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
