export interface InvoiceItem {
  id: string;
  name: string;
  hsnSac: string;
  rate: number;
  originalRate: number;
  qty: number;
  unit: string;
  discount: number;
  amount: number;       // taxable value = rate * qty
  cgstRate: number;      // e.g. 9
  sgstRate: number;      // e.g. 9
  igstRate: number;      // used only if inter-state
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
  companyGstin: string;
  companyPan: string;

  // Invoice meta
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poNumber: string;
  orderDate: string;
  paymentTerms: string;
  transporterName: string;
  vehicleNumber: string;
  fromLocation: string;
  toLocation: string;

  // Receiver (Bill To)
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin: string;
  customerStateName: string;
  customerStateCode: string;
  customerContactPerson: string;
  customerContactNumber: string;

  // Consignee (Ship To)
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  consigneeStateName: string;
  consigneeStateCode: string;
  consigneeContactPerson: string;
  consigneeContactNumber: string;
  sameAsReceiver: boolean;

  dispatchName: string;
  dispatchAddress: string;
  dispatchCity: string;
  dispatchState: string;
  dispatchPincode: string;
  reference: string;

  items: InvoiceItem[];
  bankDetails: BankDetails;
  signatureUrl: string;
  notes: string;
  specialNotes: string;
  interState: boolean; // true => IGST, false => CGST+SGST
}
