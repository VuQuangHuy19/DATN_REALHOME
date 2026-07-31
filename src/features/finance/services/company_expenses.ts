import { supabase } from '@/lib/supabase/client';
import type { DBCompanyExpense } from '@/lib/supabase/types';

export type ExpenseInsert = Omit<DBCompanyExpense, 'id' | 'created_at' | 'updated_at'>;
export type ExpenseUpdate = Partial<ExpenseInsert>;

// Fallback in-memory / localStorage cache if database table is not yet migrated
const LOCAL_STORAGE_KEY = 'realhome_company_expenses';

function getLocalExpenses(): DBCompanyExpense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalExpenses(expenses: DBCompanyExpense[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Error saving local expenses:', e);
  }
}

export async function getCompanyExpenses(companyId: string, period: string): Promise<DBCompanyExpense[]> {
  try {
    const { data, error } = await supabase
      .from('company_expenses')
      .select('*')
      .eq('company_id', companyId)
      .eq('period', period)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Auto-clone recurring items from previous month if not present in current period
      await checkAndCloneRecurringExpenses(companyId, period, data as DBCompanyExpense[]);
      return data as DBCompanyExpense[];
    }
  } catch (err) {
    console.warn('Falling back to local expenses storage:', err);
  }

  // Fallback to local storage if DB table is missing or errors out
  let local = getLocalExpenses().filter((item) => item.company_id === companyId && item.period === period);
  
  // Clone recurring from previous month if needed in fallback
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const allLocal = getLocalExpenses();
  const prevRecurring = allLocal.filter((item) => item.company_id === companyId && item.period === prevPeriod && item.is_recurring);

  let updatedLocal = [...allLocal];
  let hasNew = false;
  for (const prevItem of prevRecurring) {
    const alreadyExists = local.some((l) => l.name === prevItem.name);
    if (!alreadyExists) {
      const clonedItem: DBCompanyExpense = {
        ...prevItem,
        id: 'exp_' + Math.random().toString(36).substring(2, 9),
        period,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      local.push(clonedItem);
      updatedLocal.push(clonedItem);
      hasNew = true;
    }
  }
  if (hasNew) saveLocalExpenses(updatedLocal);

  return local;
}

async function checkAndCloneRecurringExpenses(companyId: string, period: string, currentItems: DBCompanyExpense[]) {
  try {
    const [yearStr, monthStr] = period.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const { data: prevItems } = await supabase
      .from('company_expenses')
      .select('*')
      .eq('company_id', companyId)
      .eq('period', prevPeriod)
      .eq('is_recurring', true);

    if (prevItems && prevItems.length > 0) {
      const newClones = [];
      for (const p of prevItems) {
        const exists = currentItems.some((c) => c.name === p.name);
        if (!exists) {
          newClones.push({
            company_id: companyId,
            name: p.name,
            amount: p.amount,
            category: p.category,
            is_recurring: true,
            period,
            note: p.note,
          });
        }
      }
      if (newClones.length > 0) {
        await supabase.from('company_expenses').insert(newClones);
      }
    }
  } catch (err) {
    console.error('Error auto-cloning recurring expenses:', err);
  }
}

export async function createCompanyExpense(payload: ExpenseInsert): Promise<DBCompanyExpense> {
  try {
    const { data, error } = await supabase
      .from('company_expenses')
      .insert({ ...payload, updated_at: new Date().toISOString() } as any)
      .select()
      .single();

    if (!error && data) {
      return data as DBCompanyExpense;
    }
  } catch (err) {
    console.warn('Fallback create expense to localStorage:', err);
  }

  const newItem: DBCompanyExpense = {
    id: 'exp_' + Math.random().toString(36).substring(2, 9),
    ...payload,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const all = getLocalExpenses();
  all.unshift(newItem);
  saveLocalExpenses(all);

  return newItem;
}

export async function updateCompanyExpense(id: string, payload: ExpenseUpdate): Promise<DBCompanyExpense> {
  try {
    const { data, error } = await supabase
      .from('company_expenses')
      .update({ ...payload, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      return data as DBCompanyExpense;
    }
  } catch (err) {
    console.warn('Fallback update expense in localStorage:', err);
  }

  const all = getLocalExpenses();
  const idx = all.findIndex((item) => item.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...payload, updated_at: new Date().toISOString() };
    saveLocalExpenses(all);
    return all[idx];
  }

  throw new Error('Expense not found');
}

export async function deleteCompanyExpense(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('company_expenses').delete().eq('id', id);
    if (!error) return;
  } catch (err) {
    console.warn('Fallback delete expense in localStorage:', err);
  }

  const all = getLocalExpenses().filter((item) => item.id !== id);
  saveLocalExpenses(all);
}
