import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, type DocumentSnapshot, type DocumentData, type FirestoreError } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { type Property } from '@/types';

export const useGetUserProperty = (
  userId?: string,
  propertyId?: string
) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !propertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'properties', propertyId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Optional: Security check if data.userId === userId
          // Ideally handled by Firestore Rules, but good for client-side filtering if needed
          if (data.userId === userId) {
            setProperty({ ...data, id: docSnap.id } as Property);
          } else {
            setProperty(null);
          }
        } else {
          setProperty(null);
        }
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error('Error fetching property realtime:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, propertyId]);

  // refetch is no longer strictly needed for data freshness, but kept for compatibility
  // We can make it a no-op or a way to force re-check if needed (though snapshot handles it)
  const refetch = useCallback(async () => {
    // specific logic for manual refresh if ever needed, otherwise no-op with snapshot
    return Promise.resolve();
  }, []);

  return { property, loading, refetch };
};
