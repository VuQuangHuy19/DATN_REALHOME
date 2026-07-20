import { supabase } from '../client';
import type { DBRoomImage } from '../types';

export async function getRoomImages(roomId: string): Promise<DBRoomImage[]> {
  const { data, error } = await supabase
    .from('room_images')
    .select('*')
    .eq('room_id', roomId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DBRoomImage[];
}

export async function addRoomImage(img: Omit<DBRoomImage, 'id' | 'created_at' | 'updated_at'>): Promise<DBRoomImage> {
  const { data, error } = await supabase
    .from('room_images')
    .insert(img as any)
    .select()
    .single();

  if (error) throw error;
  return data as DBRoomImage;
}

export async function deleteRoomImage(id: string): Promise<void> {
  const { error } = await supabase
    .from('room_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setRoomThumbnail(roomId: string, imageId: string): Promise<void> {
  // First set all images for the room to not be thumbnails
  const { error: resetError } = await supabase
    .from('room_images')
    .update({ is_thumbnail: false } as any)
    .eq('room_id', roomId);

  if (resetError) throw resetError;

  // Now set the selected image to be the thumbnail
  const { error: setError } = await supabase
    .from('room_images')
    .update({ is_thumbnail: true } as any)
    .eq('id', imageId);

  if (setError) throw setError;
}

export async function updateRoomImagePriority(id: string, priority: number): Promise<void> {
  const { error } = await supabase
    .from('room_images')
    .update({ priority } as any)
    .eq('id', id);

  if (error) throw error;
}
