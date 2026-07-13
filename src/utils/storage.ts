import { InvoiceData } from '../types/invoice';

const STORAGE_KEY = 'invoice_data';
const INVOICE_COUNTER_KEY = 'invoice_counter';

export function saveInvoice(data: InvoiceData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function loadInvoice(): InvoiceData | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InvoiceData;
  } catch {
    return null;
  }
}

export function getNextInvoiceNumber(): string {
  const count = parseInt(localStorage.getItem(INVOICE_COUNTER_KEY) || '0', 10);
  const next = count + 1;
  localStorage.setItem(INVOICE_COUNTER_KEY, String(next));
  return `INV-${next}`;
}

export function peekInvoiceNumber(): string {
  const count = parseInt(localStorage.getItem(INVOICE_COUNTER_KEY) || '0', 10);
  return `INV-${count + 1}`;
}

export function clearInvoice(): void {
  localStorage.removeItem(STORAGE_KEY);
}
