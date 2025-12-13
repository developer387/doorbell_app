import { collection, query, where, getDocs, QuerySnapshot, DocumentData, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Property } from '@/types/Property';

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
                // Fallback: Try to find by Document ID directly
                try {
                    const docRef = doc(db, 'properties', qrCodeUUID);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        return {
                            ...docSnap.data(),
                            id: docSnap.id
                        } as Property;
                    }
                } catch (e) {
                    console.log('Tried lookup by Doc ID and failed', e);
                }

                return null;
            }

            // Get the first matching document
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();

            return {
                ...data,
                id: docSnap.id,
            } as Property;
        } catch (error) {
            console.error('Error finding property by QR code UUID:', error);
            throw error;
        }
    }
}
