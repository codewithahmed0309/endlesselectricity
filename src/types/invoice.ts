export interface InvoiceItem {
  id: string;
  name: string;
  hsnSac: string;
  rate: number;
  originalRate: number;
  qty: number;
  unit: string;
  discount: number;
  amount: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
}

export interface InvoiceData {
  // Company
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyMobile: string;

  // Invoice meta
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;

  // Customer
  customerName: string;
  customerPhone: string;

  // Dispatch
  dispatchName: string;
  dispatchAddress: string;
  dispatchCity: string;
  dispatchState: string;
  dispatchPincode: string;
  reference: string;

  // Items
  items: InvoiceItem[];

  // Bank
  bankDetails: BankDetails;

  // Signature
  signatureUrl: string;

  // Notes
  notes: string;
}
