import { makeHook } from '@/src/lib/hooks/makeHook';
import { getBuildings, createBuilding, updateBuilding, deleteBuilding } from '@/src/features/properties/services/buildings';
import type { DBBuilding } from '@/lib/supabase/types';

export const useBuildings = makeHook<DBBuilding>(getBuildings, createBuilding, updateBuilding, deleteBuilding);
