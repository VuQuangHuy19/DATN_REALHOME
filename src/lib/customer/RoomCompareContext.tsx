'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { CustomerListing } from '@/lib/customer/types';

interface CompareContextType {
  rooms: CustomerListing[];
  addRoom: (room: CustomerListing) => void;
  removeRoom: (id: string) => void;
  clearRooms: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<CustomerListing[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bds_compare_rooms');
      if (stored) {
        setRooms(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load compare rooms from local storage", e);
    }
  }, []);

  const addRoom = (room: CustomerListing) => {
    setRooms(prev => {
      if (prev.length >= 3) {
        alert("Bạn chỉ có thể so sánh tối đa 3 phòng cùng lúc.");
        return prev;
      }
      if (prev.find(r => r.id === room.id)) return prev;
      const newRooms = [...prev, room];
      localStorage.setItem('bds_compare_rooms', JSON.stringify(newRooms));
      return newRooms;
    });
  };

  const removeRoom = (id: string) => {
    setRooms(prev => {
      const newRooms = prev.filter(r => r.id !== id);
      localStorage.setItem('bds_compare_rooms', JSON.stringify(newRooms));
      return newRooms;
    });
  };

  const clearRooms = () => {
    setRooms([]);
    localStorage.removeItem('bds_compare_rooms');
  };

  return (
    <CompareContext.Provider value={{ rooms, addRoom, removeRoom, clearRooms }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) throw new Error('useCompare must be used within CompareProvider');
  return context;
}
