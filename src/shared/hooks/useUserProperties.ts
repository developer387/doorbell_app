import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/UserContext';
import { type Property } from '@/types';

export const useUserProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const propertiesRef = collection(db, 'properties');
    const q = query(propertiesRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userProperties: Property[] = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Property));
      setProperties(userProperties);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching properties:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { properties, loading };
};
