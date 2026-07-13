import { useState, useEffect, useCallback } from 'react';
import {
  getPublicListings,
  getPublicListing,
  getPublicListingsByIds,
  getPublicListingsByBuilding,
  getPublicBuilding,
} from '@/lib/supabase/repositories/public-listings';
import type { CustomerListing } from '@/lib/customer/types';

export function usePublicListings(companyId?: string | string[] | null, showAll: boolean = false) {
  const [listings, setListings] = useState<CustomerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!companyId || (Array.isArray(companyId) && companyId.length === 0)) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setListings(await getPublicListings(companyId, showAll));
    } catch (e: any) {
      setError(e.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(companyId), showAll]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, loading, error, refetch };
}

export function usePublicListing(id?: string) {
  const [listing, setListing] = useState<CustomerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setListing(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getPublicListing(id)
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { listing, loading, error };
}

export function usePublicBuilding(id?: string) {
  const [building, setBuilding] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setBuilding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getPublicBuilding(id)
      .then(setBuilding)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { building, loading, error };
}


export function usePublicListingsByIds(ids: string[], companyId?: string | string[] | null) {
  const [listings, setListings] = useState<CustomerListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || ids.length === 0 || (Array.isArray(companyId) && companyId.length === 0)) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getPublicListingsByIds(ids, companyId)
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), JSON.stringify(companyId)]);

  return { listings, loading };
}

export function usePublicListingsByBuilding(buildingId?: string, showAll: boolean = false) {
  const [listings, setListings] = useState<CustomerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!buildingId) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setListings(await getPublicListingsByBuilding(buildingId, showAll));
    } catch (e: any) {
      setError(e.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [buildingId, showAll]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { listings, loading, error, refetch };
}

