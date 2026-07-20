import { useState, useCallback, useEffect } from 'react';
import { getRoomImages, addRoomImage, deleteRoomImage, setRoomThumbnail, updateRoomImagePriority } from '@/lib/supabase/repositories/room_images';
import type { DBRoomImage } from '@/lib/supabase/types';

export function useRoomImages(roomId?: string) {
  const [images, setImages] = useState<DBRoomImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      setImages(await getRoomImages(roomId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (img: Omit<DBRoomImage, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await addRoomImage(img);
      setImages((prev) => [...prev, created]);
      return created;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoomImage(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const makeThumbnail = async (id: string) => {
    if (!roomId) return;
    try {
      await setRoomThumbnail(roomId, id);
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_thumbnail: img.id === id,
        }))
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updatePriority = async (id: string, priority: number) => {
    try {
      await updateRoomImagePriority(id, priority);
      setImages((prev) =>
        prev
          .map((img) => (img.id === id ? { ...img, priority } : img))
          .sort((a, b) => a.priority - b.priority || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { images, loading, error, refetch: fetch, add, remove, makeThumbnail, updatePriority };
}
