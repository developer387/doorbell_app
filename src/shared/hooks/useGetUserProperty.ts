import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Property } from '@/types';

export const useGetUserProperty = (
  userId?: string,
  propertyId?: string
) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProperty = useCallback(async () => {
    if (!userId || !propertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'properties', propertyId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.userId === userId) {
          setProperty({ ...data, id: docSnap.id } as Property);
        } else {
          setProperty(null);
        }
      } else {
        setProperty(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error('Error fetching property:', err.message);
      } else {
        console.error('Unknown error fetching property');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, propertyId]);

  useEffect(() => {
    void fetchProperty();
  }, [fetchProperty]);

  return { property, loading, refetch: fetchProperty };
};
