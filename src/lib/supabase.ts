import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!url || !key) {
  throw new Error('Supabase environment variables missing');
}
export const supabase = createClient(url, key);

export interface DbInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  customer_name: string;
  customer_phone: string;
  items: unknown;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: 'paid' | 'partial' | 'due';
  reference: string | null;
  notes: string | null;
  created_at: string;
}
export interface DbCompany {
  id: string;
  name: string;
  created_at: string;
}
export interface DbCustomer {
  id: string;
  name: string;
  phone: string;
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_due: number;
  last_invoice_date: string | null;
  created_at: string;
}

export interface DbProduct {
  id: string;
  name: string;
   company: string | null;
  hsn_sac: string;
  rate: number;
  original_rate: number;
  unit: string;
  stock_qty: number;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  created_at: string;
}
