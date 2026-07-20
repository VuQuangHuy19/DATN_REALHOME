import { makeHook } from '@/src/lib/hooks/makeHook';
import { getLandlords, createLandlord, updateLandlord, deleteLandlord } from '@/lib/supabase/repositories/landlords';
import type { DBLandlord } from '@/lib/supabase/types';

export const useLandlords = makeHook<DBLandlord>(getLandlords, createLandlord, updateLandlord, deleteLandlord);
