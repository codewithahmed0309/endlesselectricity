import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Package, Tag, Settings2, Search, Camera } from 'lucide-react';
import { supabase, DbProduct, DbCategory } from '../lib/supabase';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const UNITS = ['UNT', 'PCS', 'KG', 'GM', 'LTR', 'MTR', 'BOX', 'PKT', 'DOZ', 'PAIR', 'SET', 'ROLL'];

// Seeded once into the `categories` table on first run if it's empty.
const SEED_CATEGORIES = [
  'Wires & Cables',
  'Switches & Sockets',
  'MCB / Fuses & DBs',
  'Lights & Fixtures',
  'Fans',
  'Conduits & Pipes',
  'Motors & Pumps',
  'Tools & Accessories',
  'Others',
];

type FormState = Omit<DbProduct, 'id' | 'created_at'>;

const emptyForm = (): FormState => ({
  name: '', hsn_sac: '', rate: 0, original_rate: 0, unit: 'UNT', stock_qty: 0, description: '', category: '',
});

export default function Inventory() {
  const [products, setProducts]   = useState<DbProduct[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<DbProduct | null>(null);
  const [form, setForm]           = useState<FormState>(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName]     = useState('');
  const [catErr, setCatErr]             = useState('');
  const [catSaving, setCatSaving]       = useState(false);

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setProducts(data ?? []);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      // Table probably doesn't exist yet — fall back gracefully, no create/delete available.
      console.error(error);
      setCategoriesUnavailable(true);
      return;
    }

    if ((data ?? []).length === 0) {
      // First run: seed the table with sensible defaults.
      const { data: inserted, error: seedErr } = await supabase
        .from('categories')
        .insert(SEED_CATEGORIES.map(name => ({ name })))
        .select('*');
      if (!seedErr && inserted) {
        setCategories(inserted.sort((a, b) => a.name.localeCompare(b.name)));
        return;
      }
    }
    setCategories(data ?? []);
  }

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadProducts(), loadCategories()]);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const categoryNames = useMemo(() => categories.map(c => c.name), [categories]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory === 'Uncategorized') list = list.filter(p => !p.category);
    else if (activeCategory !== 'All') list = list.filter(p => p.category === activeCategory);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.hsn_sac || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, search]);

  const lowStockCount = useMemo(() => products.filter(p => Number(p.stock_qty) <= 0).length, [products]);

  function openAdd() {
    setEditing(null); setForm(emptyForm()); setUseCustomCategory(false); setErr(''); setShowModal(true);
  }
  function openEdit(p: DbProduct) {
    setEditing(p);
    setForm({ name: p.name, hsn_sac: p.hsn_sac, rate: p.rate, original_rate: p.original_rate, unit: p.unit, stock_qty: p.stock_qty, description: p.description ?? '', category: p.category ?? '' });
    setUseCustomCategory(!!p.category && !categoryNames.includes(p.category));
    setErr(''); setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setErr('Product name is required.'); return; }
    setSaving(true); setErr('');

    // If a brand-new category was typed in, persist it to the categories table too.
    const cat = (form.category || '').trim();
    if (cat && !categoriesUnavailable && !categoryNames.includes(cat)) {
      const { error: catError } = await supabase.from('categories').insert({ name: cat });
      if (!catError) await loadCategories();
    }

    const { error } = editing
      ? await supabase.from('products').update(form).eq('id', editing.id)
      : await supabase.from('products').insert(form);
    if (error) { setErr(error.message); setSaving(false); return; }
    setSaving(false); setShowModal(false); loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadAll();
  }

  function f<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  // ── Category management (create / delete) ──────────────────────────────
  async function addCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (categoryNames.some(c => c.toLowerCase() === name.toLowerCase())) {
      setCatErr('That category already exists.');
      return;
    }
    setCatSaving(true); setCatErr('');
    const { error } = await supabase.from('categories').insert({ name });
    setCatSaving(false);
    if (error) { setCatErr(error.message); return; }
    setNewCatName('');
    loadCategories();
  }

  async function deleteCategory(cat: DbCategory) {
    const inUse = products.filter(p => p.category === cat.name).length;
    const msg = inUse > 0
      ? `"${cat.name}" is used by ${inUse} product${inUse > 1 ? 's' : ''}. Delete it anyway? Those products will become Uncategorized.`
      : `Delete category "${cat.name}"?`;
    if (!confirm(msg)) return;

    if (inUse > 0) {
      await supabase.from('products').update({ category: null }).eq('category', cat.name);
    }
    await supabase.from('categories').delete().eq('id', cat.id);
    if (activeCategory === cat.name) setActiveCategory('All');
    loadAll();
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white';
  const lbl = 'text-xs font-medium text-gray-500 mb-0.5 block';

  const CATEGORY_COLORS = [
    'bg-teal-50 text-teal-700 border-teal-200',
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-violet-50 text-violet-700 border-violet-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200',
    'bg-orange-50 text-orange-700 border-orange-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
  ];
  function categoryColor(cat: string | null) {
    if (!cat) return 'bg-gray-50 text-gray-500 border-gray-200';
    const idx = categoryNames.indexOf(cat) % CATEGORY_COLORS.length;
    return CATEGORY_COLORS[idx < 0 ? 0 : idx];
  }

  const filterTabs = ['All', ...categoryNames, 'Uncategorized'];

  // ── Scan Bill (stock in/out) ─────────────────────────────────────────────
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanPhoto, setScanPhoto] = useState<string>('');
  const [scanLines, setScanLines] = useState<{ productId: string; qty: string; direction: 'in' | 'out' }[]>([
    { productId: '', qty: '', direction: 'in' },
  ]);
  const [scanSaving, setScanSaving] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  function openScan() {
    setScanPhoto(''); setScanLines([{ productId: '', qty: '', direction: 'in' }]); setScanMsg('');
    setShowScanModal(true);
  }
  function handleScanPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScanPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }
  function updateScanLine(i: number, patch: Partial<{ productId: string; qty: string; direction: 'in' | 'out' }>) {
    setScanLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function addScanLine() {
    setScanLines(prev => [...prev, { productId: '', qty: '', direction: 'in' }]);
  }
  function removeScanLine(i: number) {
    setScanLines(prev => prev.filter((_, idx) => idx !== i));
  }
  async function applyScan() {
    const valid = scanLines.filter(l => l.productId && Number(l.qty) > 0);
    if (valid.length === 0) { setScanMsg('Add at least one item with a quantity.'); return; }
    setScanSaving(true); setScanMsg('');
    for (const line of valid) {
      const product = products.find(p => p.id === line.productId);
      if (!product) continue;
      const delta = line.direction === 'in' ? Number(line.qty) : -Number(line.qty);
      const newQty = Math.max(0, Number(product.stock_qty) + delta);
      await supabase.from('products').update({ stock_qty: newQty }).eq('id', product.id);
    }
    setScanSaving(false);
    setShowScanModal(false);
    loadAll();
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} products{lowStockCount > 0 && <span className="text-red-500"> · {lowStockCount} out of stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products…"
              className="text-sm text-gray-700 bg-transparent focus:outline-none w-36"
            />
          </div>
          {!categoriesUnavailable && (
            <button
              onClick={() => { setShowCatModal(true); setCatErr(''); setNewCatName(''); }}
              className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
            >
              <Settings2 size={15} /> Categories
            </button>
          )}
          <button
            onClick={openScan}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            <Camera size={15} /> Scan Bill
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Tag size={11} />
            {cat}
          </button>
        ))}
      </div>

      {/* Scan Bill (stock in/out) modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Scan Bill — Stock In / Out</h2>
              <button onClick={() => setShowScanModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                Snap or upload a photo of the supplier/sale bill for your records, then pick the items below to
                adjust stock. (Automatic item reading from the photo needs an AI vision add-on we haven't wired up yet —
                for now this keeps the photo as proof and makes manual entry quick.)
              </p>

              <label className="cursor-pointer block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:bg-teal-50 hover:border-teal-300 transition-colors overflow-hidden" style={{ minHeight: '120px' }}>
                  {scanPhoto ? (
                    <img src={scanPhoto} alt="bill" className="max-h-48 object-contain" />
                  ) : (
                    <>
                      <Camera size={22} className="text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Tap to capture or upload bill photo</span>
                    </>
                  )}
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanPhoto} />
              </label>

              <div className="space-y-2">
                {scanLines.map((line, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      value={line.productId}
                      onChange={e => updateScanLine(i, { productId: e.target.value })}
                    >
                      <option value="">Select product…</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input
                      type="number" min="0" placeholder="Qty"
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={line.qty}
                      onChange={e => updateScanLine(i, { qty: e.target.value })}
                    />
                    <select
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                      value={line.direction}
                      onChange={e => updateScanLine(i, { direction: e.target.value as 'in' | 'out' })}
                    >
                      <option value="in">Stock In</option>
                      <option value="out">Stock Out</option>
                    </select>
                    <button onClick={() => removeScanLine(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addScanLine} className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                  <Plus size={13} /> Add another item
                </button>
              </div>

              {scanMsg && <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{scanMsg}</div>}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowScanModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={applyScan} disabled={scanSaving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                <Check size={14} /> {scanSaving ? 'Updating…' : 'Update Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">Manage Categories</h2>
              <button onClick={() => setShowCatModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {catErr && <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{catErr}</div>}
              <div className="flex gap-2">
                <input
                  className={inp}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCategory(); }}
                  placeholder="e.g. Switch Boards"
                />
                <button
                  onClick={addCategory}
                  disabled={catSaving}
                  className="flex items-center gap-1 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-3 disabled:opacity-50 whitespace-nowrap"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 border border-gray-100 rounded-lg">
                {categories.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No categories yet.</div>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${categoryColor(cat.name)}`}>
                        {cat.name}
                      </span>
                      <button
                        onClick={() => deleteCategory(cat)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setShowCatModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              {err && <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{err}</div>}
              <div>
                <label className={lbl}>Product Name *</label>
                <input className={inp} value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. MCB 32A" />
              </div>
              <div>
                <label className={lbl}>Category</label>
                {!useCustomCategory ? (
                  <select
                    className={inp}
                    value={form.category || ''}
                    onChange={e => {
                      if (e.target.value === '__custom__') { setUseCustomCategory(true); f('category', ''); }
                      else f('category', e.target.value);
                    }}
                  >
                    <option value="">Uncategorized</option>
                    {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">+ Add new category…</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      className={inp}
                      value={form.category || ''}
                      onChange={e => f('category', e.target.value)}
                      placeholder="e.g. Switch Boards"
                    />
                    <button
                      type="button"
                      onClick={() => setUseCustomCategory(false)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 whitespace-nowrap"
                    >
                      Use list
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>HSN / SAC</label>
                  <input className={inp} value={form.hsn_sac} onChange={e => f('hsn_sac', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Unit</label>
                  <select className={inp} value={form.unit} onChange={e => f('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Sale Rate (₹)</label>
                  <input type="number" min="0" className={inp} value={form.rate || ''} onChange={e => f('rate', Number(e.target.value))} />
                </div>
                <div>
                  <label className={lbl}>Original Rate (₹)</label>
                  <input type="number" min="0" className={inp} value={form.original_rate || ''} onChange={e => f('original_rate', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Stock Quantity</label>
                <input type="number" min="0" className={inp} value={form.stock_qty || ''} onChange={e => f('stock_qty', Number(e.target.value))} />
              </div>
              <div>
                <label className={lbl}>Description</label>
                <textarea rows={2} className={inp + ' resize-none'} value={form.description ?? ''} onChange={e => f('description', e.target.value)} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading inventory…</div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No products yet. Add your first product.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No products in this category yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-5 py-3">Product</th>
                  <th className="text-left px-5 py-3">Category</th>
                  <th className="text-left px-5 py-3">HSN/SAC</th>
                  <th className="text-right px-5 py-3">Sale Rate</th>
                  <th className="text-right px-5 py-3">Orig. Rate</th>
                  <th className="text-left px-5 py-3">Unit</th>
                  <th className="text-right px-5 py-3">Stock</th>
                  <th className="text-center px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                   <td className="px-5 py-3">
  <div className="font-medium text-gray-800">{p.name}</div>

  {p.company && (
    <div className="text-xs text-teal-600 mt-0.5 font-medium">
      {p.company}
    </div>
  )}

  {p.description && (
    <div className="text-xs text-gray-400 mt-0.5">
      {p.description}
    </div>
  )}
</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${categoryColor(p.category)}`}>
                        {p.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.hsn_sac || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium">₹{fmt(Number(p.rate))}</td>
                    <td className="px-5 py-3 text-right text-gray-400">₹{fmt(Number(p.original_rate))}</td>
                    <td className="px-5 py-3 text-gray-500">{p.unit}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${Number(p.stock_qty) <= 0 ? 'text-red-500' : 'text-gray-800'}`}>
                        {Number(p.stock_qty).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
