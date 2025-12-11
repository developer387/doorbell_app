import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
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
      const ref = collection(db, 'properties');

      const q = query(
        ref,
        where('userId', '==', userId),
        where('propertyId', '==', propertyId),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setProperty({ ...doc.data(), id: doc.id } as Property);
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
