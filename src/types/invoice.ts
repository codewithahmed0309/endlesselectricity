export interface InvoiceItem {
  id: string;
  name: string;
  hsnSac: string;
  itemCode: string;
  rate: number;
  originalRate: number;
  qty: number;
  unit: string;
  discount: number;
  amount: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
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
  companyEmail: string;
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

  // Receiver (Bill to)
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin: string;
  customerStateName: string;
  customerContactPerson: string;
  customerContactNumber: string;

  // Consignee (Ship to)
  sameAsReceiver: boolean;
  consigneeName: string;
  consigneeAddress: string;
  consigneeGstin: string;
  consigneeStateName: string;
  consigneeContactPerson: string;
  consigneeContactNumber: string;

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
  specialNotes: string;
}
