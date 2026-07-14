import { LayoutDashboard, FileText, Package, Users, Zap, BarChart3, X, LucideIcon } from 'lucide-react';

export type Page = 'dashboard' | 'invoice' | 'inventory' | 'customers' | 'reports';

interface Props {
  current: Page;
  onChange: (p: Page) => void;
  open: boolean;
  onClose: () => void;
}

const nav: { id: Page; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard, hint: 'Overview'      },
  { id: 'invoice',   label: 'New Invoice', icon: FileText,        hint: 'Create & send' },
  { id: 'reports',   label: 'Reports',     icon: BarChart3,       hint: 'Monthly bills' },
  { id: 'inventory', label: 'Inventory',   icon: Package,         hint: 'Stock & items' },
  { id: 'customers', label: 'Customers',   icon: Users,           hint: 'Dues & history' },
];

export default function Sidebar({ current, onChange, open, onClose }: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-56 min-h-screen bg-zinc-900 flex flex-col flex-shrink-0 fixed md:static top-0 left-0 z-50 transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Brand */}
<div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20 overflow-hidden">
  <img src="/logo.png" alt="Endless Electrical" className="w-full h-full object-contain" />
</div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-sm leading-tight truncate">Endless Electrical</div>
            <div className="text-zinc-500 text-[10px] tracking-wide">INVOICE MANAGER</div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden text-zinc-400 hover:text-white p-1 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2">
          <div className="text-[10px] font-semibold text-zinc-600 tracking-widest px-2 mb-2">MAIN MENU</div>
          <div className="space-y-1">
            {nav.map(({ id, label, icon: Icon, hint }) => {
              const active = current === id;
              return (
                <button
                  key={id}
                  onClick={() => { onChange(id); onClose(); }}
                  className={`relative w-full flex items-center gap-3 pl-3 pr-2.5 py-2.5 rounded-xl text-sm transition-colors group ${
                    active ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
                  }`}
                >
                  {/* Active accent bar */}
                  <span
                    className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full transition-colors ${
                      active ? 'bg-teal-400' : 'bg-transparent'
                    }`}
                  />
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'bg-teal-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className={`font-medium leading-tight truncate ${active ? 'text-white' : 'text-zinc-300'}`}>
                      {label}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-zinc-800/80 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">&copy; 2026 Endless Electrical</p>
          <span className="text-[9px] font-semibold text-teal-500/80 tracking-wide">v1.0</span>
        </div>
      </aside>
    </>
  );
}
