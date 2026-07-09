import { useState, useEffect, useCallback } from 'react';
import { getLeads, getLead, createLead, updateLead, deleteLead, getLeadActivities, createLeadActivity, updateLeadStatus, type LeadInsert, type LeadUpdate, type LeadActivityInsert } from '@/lib/supabase/repositories/leads';
import type { DBLead, DBLeadActivity } from '@/lib/supabase/types';

export function useLeads(companyId?: string) {
  const [leads, setLeads] = useState<DBLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeads(companyId);
      setLeads(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (lead: LeadInsert) => {
    try {
      const data = await createLead(lead);
      setLeads((prev) => [data, ...prev]);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const update = async (id: string, patch: LeadUpdate) => {
    try {
      const data = await updateLead(id, patch);
      setLeads((prev) => prev.map((l) => l.id === id ? data : l));
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return { leads, loading, error, refetch: fetch, add, update, remove };
}

export function useLeadDetail(leadId: string) {
  const [lead, setLead] = useState<DBLead | null>(null);
  const [activities, setActivities] = useState<DBLeadActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    Promise.all([getLead(leadId), getLeadActivities(leadId)]).then(([ld, acts]) => {
      setLead(ld);
      setActivities(acts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [leadId]);

  const addActivity = async (activity: LeadActivityInsert) => {
    const data = await createLeadActivity(activity);
    setActivities((prev) => [...prev, data]);
    return data;
  };

  const changeStatus = async (newStatus: DBLead['status'], userId: string, userName: string) => {
    if (!lead) return null;
    const data = await updateLeadStatus(leadId, newStatus, userId, userName);
    setLead((prev) => prev ? { ...prev, status: newStatus } : prev);
    return data;
  };

  return { lead, activities, loading, addActivity, changeStatus };
}
