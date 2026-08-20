// pages/MenuView.tsx - READ-ONLY PUBLIC MENU DISPLAY (no editing controls)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Edit3 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────
interface Dish {
  _id: string;
  name: string;
  price: number;
  category: string;
  categoryName?: string;
  image?: string;
  dietaryType?: string;
  description?: string;
  hasVariants?: boolean;
  variants?: Array<{ name: string; price: number; size?: string; description?: string; }>;
}

interface MenuSection {
  id: string;
  name: string;
  description: string;
  dishes: Dish[];
  isVisible: boolean;
}

interface SavedMenuData {
  menuName: string;
  sections: MenuSection[];
  savedAt: string;
}

// ─── Helper Functions ──────────────────────────────────────────────────

const getDisplayPrice = (dish: Dish): string => {
  if (dish.hasVariants && dish.variants && dish.variants.length > 0) {
    const prices = dish.variants.map(v => v.price).filter(p => p > 0);
    if (prices.length === 0) {
      if (dish.price && dish.price > 0) return `₹${dish.price}`;
      return '';
    }
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return `₹${minPrice}`;
    return `₹${minPrice} - ₹${maxPrice}`;
  }
  if (dish.price && dish.price > 0) return `₹${dish.price}`;
  return '';
};

const splitSectionTitle = (name: string): { lead: string; rest: string } => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { lead: parts[0], rest: '' };
  return { lead: parts[0], rest: parts.slice(1).join(' ') };
};

const dietaryIcon = (type?: string) => {
  switch (type) {
    case 'Veg': return '🌱';
    case 'Non-veg': return '🍖';
    case 'Vegan': return '🌿';
    case 'Jain': return '🪷';
    default: return null;
  }
};

// ─── Read-only Dish Row ──────────────────────────────────────────────────

const MenuViewDishItem: React.FC<{ dish: Dish; accent: string }> = ({ dish, accent }) => {
  const displayPrice = getDisplayPrice(dish);
  const hasVariants = dish.hasVariants && dish.variants && dish.variants.length > 0;

  return (
    <div className="py-2.5 px-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] leading-none mt-1 shrink-0 ${accent === 'red' ? 'text-red-500' : 'text-yellow-400'}`}>
              ▸
            </span>
            <span className="font-bold text-neutral-100 text-[13px] uppercase tracking-wide">
              {dish.name}
            </span>
            {dietaryIcon(dish.dietaryType) && (
              <span className="text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
                {dietaryIcon(dish.dietaryType)}
              </span>
            )}
          </div>
          {dish.description && (
            <p className="text-[11px] text-neutral-400 mt-0.5 italic pl-4">{dish.description}</p>
          )}
          {hasVariants && (
            <div className="mt-1.5 ml-4 space-y-0.5">
              {dish.variants!.map((v, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs px-0 py-0.5">
                  <span className="text-neutral-400">{v.name}{v.size && ` (${v.size})`}</span>
                  <span className="font-semibold text-yellow-400">₹{v.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {!hasVariants && displayPrice && (
          <span className="inline-flex items-center justify-center min-w-[52px] bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm shadow-red-900/40 whitespace-nowrap shrink-0">
            {displayPrice}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Read-only Section Card ──────────────────────────────────────────────

const MenuViewSection: React.FC<{ section: MenuSection; index: number }> = ({ section, index }) => {
  const accent = index % 2 === 0 ? 'red' : 'gold';
  const accentText = accent === 'red' ? 'text-red-500' : 'text-yellow-400';
  const accentBorder = accent === 'red' ? 'border-red-500/30' : 'border-yellow-400/30';
  const accentBg = accent === 'red' ? 'bg-red-500' : 'bg-yellow-400';
  const { lead, rest } = splitSectionTitle(section.name);

  if (section.dishes.length === 0) return null;

  return (
    <div className={`relative bg-neutral-900 rounded-xl border ${accentBorder} shadow-lg break-inside-avoid`}>
      <div className={`h-1 w-full rounded-t-xl ${accentBg}`} />

      <div className="px-4 py-3.5 border-b border-white/10">
        <h3 className="text-lg font-black tracking-wide leading-tight">
          <span className="text-white">{lead.toUpperCase()}</span>
          {rest && <span className={`${accentText} ml-1.5`}>{rest.toUpperCase()}</span>}
        </h3>
        {section.description && (
          <p className="text-[11px] text-neutral-400 italic mt-0.5">{section.description}</p>
        )}
      </div>

      <div className="p-3 divide-y divide-dotted divide-white/10">
        {section.dishes.map((dish) => (
          <MenuViewDishItem key={dish._id} dish={dish} accent={accent} />
        ))}
      </div>
    </div>
  );
};

// ─── MAIN MENU VIEW PAGE ──────────────────────────────────────────────────

const MenuView: React.FC = () => {
  const navigate = useNavigate();
  const [menuData, setMenuData] = useState<SavedMenuData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedMenu = localStorage.getItem('menuBuilderData');
    if (savedMenu) {
      try {
        setMenuData(JSON.parse(savedMenu));
      } catch {
        setMenuData(null);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
      </div>
    );
  }

  const visibleSections = (menuData?.sections || []).filter(s => s.isVisible && s.dishes.length > 0);
  const totalDishes = visibleSections.reduce((total, s) => total + s.dishes.length, 0);

  if (!menuData || visibleSections.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-black text-white uppercase tracking-wide mb-2">No menu to show yet</h2>
          <p className="text-neutral-500 mb-6">Build and save a menu first, then it'll appear here.</p>
          <button
            onClick={() => navigate('/menu-builder')}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold uppercase tracking-wide text-sm hover:shadow-lg hover:shadow-red-900/40 transition inline-flex items-center gap-2"
          >
            <Edit3 size={16} /> Go to Menu Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative print:bg-white">
      <div
        className="pointer-events-none fixed inset-0 print:hidden"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 900px 500px at 15% 0%, rgba(220,38,38,0.12), transparent 60%), radial-gradient(ellipse 900px 500px at 85% 100%, rgba(234,179,8,0.08), transparent 60%)',
        }}
      />

      {/* Minimal toolbar — no edit controls, just navigation/utility */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-neutral-950/80 border-b border-white/10 print:hidden">
        <div className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition flex items-center gap-2 text-neutral-300 hover:text-white text-sm"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/5 border border-white/10 text-neutral-300 rounded-xl text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={() => navigate('/menu-builder')}
              className="px-4 py-2 bg-white/5 border border-white/10 text-neutral-300 rounded-xl text-sm font-medium hover:bg-white/10 transition flex items-center gap-2"
            >
              <Edit3 size={16} /> Edit Menu
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full px-4 sm:px-8 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="relative bg-neutral-950 rounded-3xl shadow-2xl border border-white/10 overflow-hidden print:shadow-none print:border-0">
            <div
              className="pointer-events-none absolute inset-0 opacity-40 print:hidden"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at top, rgba(220,38,38,0.18), transparent 55%), radial-gradient(ellipse at bottom, rgba(0,0,0,0.6), transparent 60%)',
              }}
            />

            {/* Header */}
            <div className="relative bg-gradient-to-b from-black via-neutral-900 to-neutral-950 px-6 pt-12 pb-9 text-center border-b border-red-600/30">
              <div className="flex justify-center items-center gap-3 text-yellow-400 text-[11px] tracking-[0.35em] uppercase mb-4">
                <span className="h-px w-10 bg-yellow-400/60" />
                <span>Fine Dining</span>
                <span className="h-px w-10 bg-yellow-400/60" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-white uppercase tracking-tight leading-none drop-shadow-[0_3px_0_rgba(220,38,38,0.9)]">
                {menuData.menuName || 'My Restaurant'}
              </h1>
              <p className="text-neutral-400 text-xs mt-4 uppercase tracking-[0.3em]">Crafted with love</p>
              <div className="flex justify-center items-center gap-3 mt-5 text-[11px] text-neutral-500">
                <span className="text-yellow-400 tracking-widest">★ ★ ★ ★ ★</span>
                <span className="text-neutral-700">|</span>
                <span className="uppercase tracking-wider">Est. 2024</span>
              </div>
              <div className="absolute left-0 right-0 -bottom-px h-1.5 bg-gradient-to-r from-red-600 via-red-600 to-yellow-400" />
            </div>

            {/* Sections */}
            <div className="relative p-6 sm:p-10 bg-neutral-950">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                {visibleSections.map((section, index) => (
                  <MenuViewSection key={section.id} section={section} index={index} />
                ))}
              </div>

              <div className="mt-10 pt-7 border-t border-white/10 text-center">
                <div className="flex justify-center gap-6 text-[11px] text-neutral-500 uppercase tracking-widest">
                  <span>✦ All prices are in Indian Rupees ✦</span>
                </div>
                <div className="flex flex-wrap justify-center gap-6 mt-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><span className="text-green-500">🌱</span> Veg</span>
                  <span className="flex items-center gap-1"><span className="text-red-500">🍖</span> Non-Veg</span>
                  <span className="flex items-center gap-1"><span className="text-emerald-500">🌿</span> Vegan</span>
                  <span className="flex items-center gap-1"><span className="text-amber-500">🪷</span> Jain</span>
                </div>
                <div className="mt-5 flex justify-center items-center gap-3 text-yellow-400">
                  <span className="text-lg">✦</span>
                  <span className="text-sm uppercase tracking-[0.2em] font-semibold text-neutral-300">Bon Appétit</span>
                  <span className="text-lg">✦</span>
                </div>
              </div>
            </div>

            <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 py-3 text-center">
              <span className="text-white text-xs font-black uppercase tracking-[0.3em]">
                Thank You <span className="text-yellow-300">For Dining With Us</span>
              </span>
            </div>
          </div>

          <div className="mt-5 text-center text-sm text-neutral-500 print:hidden">
            <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-full">
              🍽️ {totalDishes} dishes across {visibleSections.length} sections
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuView;