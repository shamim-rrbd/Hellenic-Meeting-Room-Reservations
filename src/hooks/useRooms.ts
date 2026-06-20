import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Room } from '../types';

export const INITIAL_ROOMS_DATA: Room[] = [
  { id: 'harebell', name: 'Harebell', capacity: 12, facilities: 'HDMI projector, smartboard, polycom audio', status: 'Online' },
  { id: 'scandinavia', name: 'Scandinavia', capacity: 8, facilities: 'LCD screen, high speed videoconference, whiteboard', status: 'Online' },
  { id: 'far-east', name: 'Far East', capacity: 6, facilities: 'LCD screen, direct telecom unit, analog pad', status: 'Online' },
  { id: 'nordic', name: 'Nordic', capacity: 10, facilities: 'Dual flat screens, premium soundbar, glass-board', status: 'Online' },
  { id: 'rooftop', name: 'Rooftop Cafeteria', capacity: 30, facilities: 'Ambient sound system, wireless mic, food service ready', status: 'Online' },
];

export function useRooms(isAdmin: boolean = false) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribes/listeners
  useEffect(() => {
    const q = collection(db, 'rooms');

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, we fall back to pre-defined config
          setRooms(INITIAL_ROOMS_DATA);
          
          // Seed rooms in Firestore automatically if we are an authorized administrator
          if (auth.currentUser && isAdmin) {
            try {
              const batch = writeBatch(db);
              INITIAL_ROOMS_DATA.forEach((room) => {
                const docRef = doc(db, 'rooms', room.id);
                batch.set(docRef, {
                  name: room.name,
                  capacity: room.capacity,
                  facilities: room.facilities,
                  status: room.status || 'Online',
                });
              });
              await batch.commit();
              console.log("Successfully seeded rooms collection in Firestore.");
            } catch (err) {
              console.error("Failed to auto-seed default rooms in Firestore:", err);
            }
          }
        } else {
          const fetchedRooms = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || '',
            capacity: doc.data().capacity ?? 8,
            facilities: doc.data().facilities || '',
            status: doc.data().status || 'Online',
          } as Room));

          // Retain order matching standard design
          const orderMap = { 'harebell': 0, 'scandinavia': 1, 'far-east': 2, 'nordic': 3, 'rooftop': 4 };
          fetchedRooms.sort((a, b) => {
            const indexA = orderMap[a.id as keyof typeof orderMap] ?? 99;
            const indexB = orderMap[b.id as keyof typeof orderMap] ?? 99;
            return indexA - indexB;
          });

          setRooms(fetchedRooms);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error reading rooms from Firestore snapshot, returning local fallback:", error);
        setRooms(INITIAL_ROOMS_DATA);
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'rooms');
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  return { rooms, loading };
}
