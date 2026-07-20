import { makeHook } from '@/src/lib/hooks/makeHook';
import { getManagers, createManager, updateManager, deleteManager } from '@/src/features/managers/services/managers';
import type { DBManager } from '@/lib/supabase/types';

export const useManagers = makeHook<DBManager>(getManagers, createManager, updateManager, deleteManager);
