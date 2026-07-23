import { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Image as ImageIcon, MessageCircle, RefreshCw, Eye, EyeOff, Loader2, Save, CheckCircle, Menu } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoiceForm from './components/InvoiceForm';
import InvoicePreview from './components/InvoicePreview';
import Sidebar, { Page } from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import { InvoiceData } from './types/invoice';
import { saveInvoice, loadInvoice, getNextInvoiceNumber, peekInvoiceNumber, clearInvoice } from './utils/storage';
import { supabase, DbProduct, DbInvoice } from './lib/supabase';

const today = () => new Date().toISOString().split('T')[0];

function defaultData(): InvoiceData {
  return {
    // Company
    logoUrl: '',
    companyName: 'Endless Electrical',
    companyAddress: 'Shop No. 1, Main Market Road',
    companyCity: 'Your City, STATE, 000000',
    companyMobile: '+91 00000 00000',
    companyEmail: '',
    companyGstin: '',
    companyPan: '',

    // Invoice meta
    invoiceNumber: peekInvoiceNumber(),
    invoiceDate: today(),
    dueDate: today(),
    poNumber: '',
    orderDate: today(),
    paymentTerms: '',
    transporterName: '',
    vehicleNumber: '',
    fromLocation: '',
    toLocation: '',

    // Receiver (Bill to)
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerGstin: '',
    customerStateName: '',
    customerContactPerson: '',
    customerContactNumber: '',

    // Consignee (Ship to)
    sameAsReceiver: true,
    consigneeName: '',
    consigneeAddress: '',
    consigneeGstin: '',
    consigneeStateName: '',
    consigneeContactPerson: '',
    consigneeContactNumber: '',

    // Dispatch
    dispatchName: 'Endless Electrical',
    dispatchAddress: 'Shop No. 1, Main Market Road',
    dispatchCity: 'Your City',
    dispatchState: 'STATE',
    dispatchPincode: '000000',
    reference: '',

    // Items
    items: [{
      id: crypto.randomUUID(),
      itemCode: '',
      name: '', hsnSac: '', rate: 0, originalRate: 0,
      qty: 1, unit: 'UNT', discount: 0, amount: 0,
      cgstRate: 9, sgstRate: 9, igstRate: 0,
      isNoReturn: false,
    }],

    // Bank
    bankDetails: {
      bankName: 'ICICI Bank',
      accountNumber: '642201002623',
      ifscCode: 'ICIC0006422',
      branch: 'MAHAD',
      upiId: '',
    },

    // Signature
    signatureUrl: '',

    // Notes
    notes: 'Thank you for choosing Endless Electrical!\n\nGoods once sold will not be taken back or exchanged. Please check the material before leaving the store.',
    specialNotes: '',
  };
}

export default function App() {
  const [page, setPage]     = useState<Page>('invoice');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [data, setData]     = useState<InvoiceData>(() => {
    const saved = loadInvoice();
    if (!saved) return defaultData();
    // Merge onto full defaults so any fields missing from an older saved
    // record (schema drift) fall back to sane defaults instead of undefined.
    const def = defaultData();
    return {
      ...def,
      ...saved,
      items: saved.items?.length
        ? saved.items.map(i => ({ ...def.items[0], ...i, id: i.id || crypto.randomUUID() }))
        : def.items,
      bankDetails: { ...def.bankDetails, ...saved.bankDetails },
    };
  });
  const [showPreview, setShowPreview] = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  // Track the Supabase ID of the current invoice so re-saves update rather than insert
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveInvoice(data); }, [data]);

  useEffect(() => {
    supabase.from('products').select('*').order('name').then(({ data, error }) => {
      if (error) throw new Error(error.message);
      if (data) setProducts(data);
    });
  }, []);

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── New invoice ─────────────────────────────────────────────────────────────
  const handleNewInvoice = () => {
    const num = getNextInvoiceNumber();
    clearInvoice();
    const fresh = defaultData();
    fresh.invoiceNumber = num;
    setData(fresh);
    setSavedInvoiceId(null);
    showToast('New invoice ready');
  };

  // ── Load an existing invoice (from Dashboard) back into the form for editing ──
  const handleEditInvoice = (inv: DbInvoice) => {
    const items = Array.isArray(inv.items) && (inv.items as unknown[]).length > 0
      ? (inv.items as InvoiceData['items'])
      : defaultData().items;

    setData(prev => ({
      ...prev,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date || today(),
      dueDate: inv.due_date || today(),
      customerName: inv.customer_name || '',
      customerPhone: inv.customer_phone || '',
      reference: inv.reference || '',
      notes: inv.notes || prev.notes,
      items,
    }));
    setSavedInvoiceId(inv.id);
    setPage('invoice');
    showToast(`Editing invoice ${inv.invoice_number}`);
  };

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  async function persistInvoice() {
    const totalAmount = data.items.reduce((s, i) => s + Number(i.amount), 0);
    const trimmedCustomerName = data.customerName.trim();
    const trimmedCustomerPhone = data.customerPhone.trim();

    if (savedInvoiceId) {
      // Update existing record
      const { data: existingInvoice, error: existingError } = await supabase
        .from('invoices')
        .select('amount_paid')
        .eq('id', savedInvoiceId)
        .single();

      if (existingError) throw new Error(existingError.message);

      const amountPaid = Number(existingInvoice?.amount_paid || 0);
      const amountDue = Math.max(0, totalAmount - amountPaid);

      const { error } = await supabase
        .from('invoices')
        .update({
          invoice_number: data.invoiceNumber,
          invoice_date: data.invoiceDate || null,
          due_date: data.dueDate || null,
          customer_name: trimmedCustomerName,
          customer_phone: trimmedCustomerPhone,
          items: data.items,
          total_amount: totalAmount,
          amount_due: amountDue,
          reference: data.reference || null,
          notes: data.notes || null,
        })
        .eq('id', savedInvoiceId);
      if (error) throw new Error(error.message);

      if (trimmedCustomerPhone) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('customer_phone', trimmedCustomerPhone);

        const invs = invoices ?? [];

        const updatedTotalAmount = invs.reduce(
          (s, i) => s + Number(i.total_amount),
          0
        );

        const totalPaid = invs.reduce(
          (s, i) => s + Number(i.amount_paid),
          0
        );

        const totalDue = invs.reduce(
          (s, i) => s + Number(i.amount_due),
          0
        );

        await supabase
          .from('customers')
          .update({
            total_amount: updatedTotalAmount,
            total_paid: totalPaid,
            total_due: totalDue
          })
          .eq('phone', trimmedCustomerPhone);
      }
    } else {
      // Insert new record
      const { data: row, error } = await supabase.from('invoices').insert({
        invoice_number: data.invoiceNumber,
        invoice_date:   data.invoiceDate || null,
        due_date:       data.dueDate     || null,
        customer_name:  trimmedCustomerName,
        customer_phone: trimmedCustomerPhone,
        items:          data.items,
        total_amount:   totalAmount,
        amount_paid:    0,
        amount_due:     totalAmount,
        status:         'due',
        reference:      data.reference || null,
        notes:          data.notes     || null,
      }).select('id').single();
      if (error) throw new Error(error.message);
      setSavedInvoiceId(row.id);

      // Upsert customer
      if (trimmedCustomerPhone) {
        const { data: existing } = await supabase
          .from('customers').select('id, total_invoices, total_amount, total_due')
          .eq('phone', trimmedCustomerPhone).maybeSingle();

        if (existing) {
          await supabase.from('customers').update({
            name:              trimmedCustomerName,
            total_invoices:    Number(existing.total_invoices) + 1,
            total_amount:      Number(existing.total_amount)   + totalAmount,
            total_due:         Number(existing.total_due)      + totalAmount,
            last_invoice_date: data.invoiceDate || null,
          }).eq('id', existing.id);
        } else {
          await supabase.from('customers').insert({
            name:              trimmedCustomerName,
            phone:             trimmedCustomerPhone,
            total_invoices:    1,
            total_amount:      totalAmount,
            total_paid:        0,
            total_due:         totalAmount,
            last_invoice_date: data.invoiceDate || null,
          });
        }
      }
    }
  }

  const handleSave = async () => {
  setSaving(true);

  try {
    if (!data.customerName.trim()) {
      showToast("Customer name required", false);
      return;
    }

    if (!data.customerPhone.trim()) {
      showToast("Customer phone required", false);
      return;
    }

    if (data.items.length === 0) {
      showToast("Add at least one item", false);
      return;
    }

    const invalidItem = data.items.find(
      (item) => !item.name.trim() || item.qty <= 0 || item.rate <= 0
    );
    if (invalidItem) {
      showToast("All items must have a name, qty > 0, and rate > 0", false);
      return;
    }

    await persistInvoice();
    showToast('Invoice saved!');
  } catch (e: unknown) {
    showToast((e as Error).message, false);
  } finally {
    setSaving(false);
  }
};

  // ── Capture the invoice as a canvas ──────────────────────────────────────────
  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const el = previewRef.current;
    if (!el) return null;
    return html2canvas(el, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      letterRendering: true,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
  };

  // ── PDF generation (standard A4 page) ────────────────────────────────────────
  const generatePdf = async (): Promise<Blob | null> => {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return null;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfH = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 5; // 5mm margin
      const contentW = pdfW - (margin * 2);
      const contentH = pdfH - (margin * 2);

      // Calculate image dimensions to fit width
      // CAPTURE_SCALE must match the `scale` passed to html2canvas in
      // captureCanvas() above — it's how many device pixels the canvas
      // has per CSS pixel. Keep these two in sync if you ever change one.
      const CAPTURE_SCALE = 3;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const scaleX = contentW / (imgW / CAPTURE_SCALE);
      const scaledH = (imgH / CAPTURE_SCALE) * scaleX;

      // If scaled height fits in one page, use it
      if (scaledH <= contentH) {
        pdf.addImage(imgData, 'PNG', margin, margin, contentW, scaledH);
      } else {
        // Scale down further to fit in one page
        const fitScale = contentH / scaledH;
        const finalW = contentW * fitScale;
        const finalH = contentH;
        const offsetX = (pdfW - finalW) / 2;
        pdf.addImage(imgData, 'PNG', offsetX, margin, finalW, finalH);
      }
      return pdf.output('blob');
    } finally {
      setGenerating(false);
    }
  };

  // ── PNG image generation ─────────────────────────────────────────────────────
  const generateImageBlob = async (): Promise<Blob | null> => {
    setGenerating(true);
    try {
      const canvas = await captureCanvas();
      if (!canvas) return null;
      return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png', 1));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generatePdf();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.invoiceNumber || 'invoice'}.pdf`; a.click();
    URL.revokeObjectURL(url);
    showToast('PDF downloaded');
  };

  const handleDownloadImage = async () => {
    const blob = await generateImageBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${data.invoiceNumber || 'invoice'}.png`; a.click();
    URL.revokeObjectURL(url);
    showToast('Image downloaded');
  };

  const handleWhatsApp = async () => {
    const blob = await generateImageBlob();
    if (!blob) return;
    const fileName = `${data.invoiceNumber || 'invoice'}.png`;
    const text = `Dear ${data.customerName || 'Customer'}, please find your invoice ${data.invoiceNumber} attached.`;

    // On mobile, the native share sheet lets the person pick WhatsApp directly
    // and attaches the image for them — no manual attach step needed.
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        showToast('Shared');
        return;
      } catch {
        // User cancelled the share sheet, or it failed — fall back below.
      }
    }

    // Fallback: download the image, then open WhatsApp with the message pre-filled
    // (the person attaches the just-downloaded image manually).
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);

    const phone = data.customerPhone.replace(/\D/g, '');
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/91${phone}?text=${encodedText}`, '_blank');
    showToast('Image downloaded & WhatsApp opened');
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar current={page} onChange={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Mobile top bar (hamburger) ── */}
        <div className="md:hidden flex items-center gap-3 bg-zinc-900 px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 -ml-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-bold text-sm">Endless Electrical</span>
        </div>

        {/* ── Invoice page ── */}
        {page === 'invoice' && (
          <>
            <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-sm font-bold text-gray-900">New Invoice</h1>
                <p className="text-[11px] text-gray-400">Fill the form — preview updates live</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                >
                  {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showPreview ? 'Form' : 'Preview'}
                </button>
                <button
                  onClick={handleNewInvoice}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50"
                >
                  <RefreshCw size={13} /> New
                </button>
                <button
                  onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-black rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
                <button
                  onClick={handleDownload} disabled={generating}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  PDF
                </button>
                <button
                  onClick={handleDownloadImage} disabled={generating}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-300 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                  Image
                </button>
                <button
                  onClick={handleWhatsApp} disabled={generating || saving}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg px-3 py-1.5 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {generating ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                  Send
                </button>
              </div>
            </header>

            <div className="flex-1 grid lg:grid-cols-[420px_1fr] overflow-hidden">
              {/* Form */}
              <div className={`bg-white border-r border-gray-200 overflow-y-auto p-5 ${showPreview ? 'hidden lg:block' : 'block'}`}>
                <InvoiceForm data={data} onChange={setData} products={products} />
              </div>
              {/* Preview */}
              <div className={`bg-gray-200 overflow-auto ${showPreview ? 'block' : 'hidden lg:block'}`}>
                <div className="p-6">
                  <div className="shadow-xl mx-auto" style={{ maxWidth: '800px' }}>
                    <InvoicePreview ref={previewRef} data={data} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Dashboard ── */}
        {page === 'dashboard' && (
          <div className="flex-1 overflow-y-auto">
            <Dashboard onEdit={handleEditInvoice} />
          </div>
        )}

        {/* ── Reports ── */}
        {page === 'reports' && (
          <div className="flex-1 overflow-y-auto">
            <Reports onOpen={handleEditInvoice} />
          </div>
        )}

        {/* ── Inventory ── */}
        {page === 'inventory' && (
          <div className="flex-1 overflow-y-auto">
            <Inventory />
          </div>
        )}

        {/* ── Customers ── */}
        {page === 'customers' && (
          <div className="flex-1 overflow-y-auto">
            <Customers />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${toast.ok ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok && <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
