import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getPriceRanges,
  createPriceRange,
  updatePriceRange,
  deletePriceRange,
  getAmenities,
  getAreas,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  type DBPriceRange,
  type DBAmenity,
  type DBRoomType,
} from '@/lib/supabase/repositories/categories';

export function usePriceRanges(companyId?: string) {
  const [items, setItems] = useState<DBPriceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getPriceRanges(companyId || ''));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (payload: Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createPriceRange(payload);
      setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
      toast.success('Đã thêm mức giá');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const update = async (
    id: string,
    payload: Partial<Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      if (id.startsWith('def-') || id.startsWith('bld-')) {
        const fullPayload: any = { company_id: companyId || null, ...payload };
        const item = await createPriceRange(fullPayload);
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        toast.success('Đã cập nhật mức giá');
        return item;
      }
      const item = await updatePriceRange(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật mức giá');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      if (!id.startsWith('def-') && !id.startsWith('bld-')) {
        await deletePriceRange(id);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa mức giá');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useAmenities(companyId?: string, category: string = 'amenity') {
  const [items, setItems] = useState<DBAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAmenities(companyId || '', category));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (payload: Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createAmenity({ ...payload, category: payload.category || category });
      setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
      toast.success(category === 'rule' ? 'Đã thêm quy định' : 'Đã thêm tiện ích');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const update = async (
    id: string,
    payload: Partial<Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      if (id.startsWith('def-') || id.startsWith('bld-')) {
        const fullPayload: any = {
          company_id: companyId || null,
          category: payload.category || category,
          name: payload.name || '',
          icon: payload.icon || null,
        };
        const item = await createAmenity(fullPayload);
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        toast.success(category === 'rule' ? 'Đã cập nhật quy định' : 'Đã cập nhật tiện ích');
        return item;
      }
      const item = await updateAmenity(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success(category === 'rule' ? 'Đã cập nhật quy định' : 'Đã cập nhật tiện ích');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      if (!id.startsWith('def-') && !id.startsWith('bld-')) {
        await deleteAmenity(id);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(category === 'rule' ? 'Đã xóa quy định' : 'Đã xóa tiện ích');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useRentalRules(companyId?: string) {
  return useAmenities(companyId, 'rule');
}

export function useAreas(companyId?: string) {
  const [items, setItems] = useState<DBAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAreas(companyId || ''));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (payload: Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createAmenity({ ...payload, category: 'area' });
      setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
      toast.success('Đã thêm khu vực');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const update = async (
    id: string,
    payload: Partial<Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      if (id.startsWith('def-') || id.startsWith('bld-')) {
        const fullPayload: any = {
          company_id: companyId || null,
          category: 'area',
          name: payload.name || '',
          icon: payload.icon || '📍',
        };
        const item = await createAmenity(fullPayload);
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        toast.success('Đã cập nhật khu vực');
        return item;
      }
      const item = await updateAmenity(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật khu vực');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      if (!id.startsWith('def-') && !id.startsWith('bld-')) {
        await deleteAmenity(id);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa khu vực');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useRoomTypesCatalog(companyId?: string) {
  const [items, setItems] = useState<DBRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getRoomTypes(companyId));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const add = async (payload: Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createRoomType(payload);
      setItems((prev) => [...prev.filter((i) => i.id !== item.id), item]);
      toast.success('Đã thêm loại phòng');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const update = async (
    id: string,
    payload: Partial<Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      if (id.startsWith('def-') || id.startsWith('bld-')) {
        const fullPayload: any = {
          company_id: companyId || null,
          name: payload.name || '',
          icon: payload.icon || '🏢',
          description: payload.description || null,
        };
        const item = await createRoomType(fullPayload);
        setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
        toast.success('Đã cập nhật loại phòng');
        return item;
      }
      const item = await updateRoomType(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật loại phòng');
      return item;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      if (!id.startsWith('def-') && !id.startsWith('bld-')) {
        await deleteRoomType(id);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa loại phòng');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}
