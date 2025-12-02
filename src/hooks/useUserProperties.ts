import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/UserContext';
import { type Property } from '@/types';

export const useUserProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProperties = async () => {
      setLoading(true);
      try {
        const propertiesRef = collection(db, 'properties');
        const q = query(propertiesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);

        const userProperties: Property[] = querySnapshot.docs.map(doc => doc.data() as Property);
        setProperties(userProperties);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };
  //@typescript-eslint/no-floating-promises
    fetchProperties();
  }, [user]);

  return { properties, loading };
};
