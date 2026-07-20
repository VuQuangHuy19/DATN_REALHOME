import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { getPriceRanges, createPriceRange, updatePriceRange, deletePriceRange, getAmenities, createAmenity, updateAmenity, deleteAmenity, getRoomTypes, createRoomType, updateRoomType, deleteRoomType, type DBPriceRange, type DBAmenity, type DBRoomType } from '@/src/lib/supabase/repositories/categories';
import { getProvinces, getDistricts, getWards, type VnProvince, type VnDistrict, type VnWard } from '@/src/lib/supabase/repositories/vn_locations';

export function usePriceRanges(companyId?: string) {
  const [items, setItems] = useState<DBPriceRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getPriceRanges(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createPriceRange(payload);
      setItems((prev) => [...prev, item]);
      toast.success('Đã thêm mức giá');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBPriceRange, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updatePriceRange(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật mức giá');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deletePriceRange(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa mức giá');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useAmenities(companyId?: string) {
  const [items, setItems] = useState<DBAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getAmenities(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createAmenity(payload);
      setItems((prev) => [...prev, item]);
      toast.success('Đã thêm tiện ích');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBAmenity, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updateAmenity(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật tiện ích');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteAmenity(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa tiện ích');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useRoomTypesCatalog(companyId?: string) {
  const [items, setItems] = useState<DBRoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    try {
      setItems(await getRoomTypes(companyId));
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (payload: Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const item = await createRoomType(payload);
      setItems((prev) => [...prev, item]);
      toast.success('Đã thêm loại phòng');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const update = async (id: string, payload: Partial<Omit<DBRoomType, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const item = await updateRoomType(id, payload);
      setItems((prev) => prev.map((i) => (i.id === id ? item : i)));
      toast.success('Đã cập nhật loại phòng');
      return item;
    } catch (e: any) { toast.error(e.message); return null; }
  };

  const remove = async (id: string) => {
    try {
      await deleteRoomType(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Đã xóa loại phòng');
    } catch (e: any) { toast.error(e.message); }
  };

  return { items, loading, error, refetch: fetch, add, update, remove };
}

export function useVnProvinces() {
  const [items, setItems] = useState<VnProvince[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProvinces().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  return { items, loading };
}

export function useVnDistricts(provinceId?: string) {
  const [items, setItems] = useState<VnDistrict[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDistricts(provinceId).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [provinceId]);

  return { items, loading };
}

export function useVnWards(districtId?: string) {
  const [items, setItems] = useState<VnWard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!districtId) { setItems([]); return; }
    setLoading(true);
    getWards(districtId).then(setItems).catch(console.error).finally(() => setLoading(false));
  }, [districtId]);

  return { items, loading };
}
