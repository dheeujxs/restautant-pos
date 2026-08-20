// pages/billing/BillDetailPage.tsx - FIXED VERSION
// ✅ KEY FIX: Changed final conditional from === 'pending' to !== 'paid'
// This ensures all non-paid bills show the payment collection view

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { adminApi } from '../../services/api';
import {
  ArrowLeft, Printer, Wallet, CreditCard, Smartphone,
  CheckCircle, Loader2, Receipt, Clock, MapPin,
  Banknote, Sparkles, Hash, Calendar, Users,
  ChefHat, Coffee, ShoppingBag, Truck, AlertCircle,
  TrendingUp, Package, Utensils, Gift, Star, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

/* ─── Types ──────────────────────────────────────────────────── */
interface IBillItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  roundNumber?: number;
  personName?: string;
  notes?: string;
}

interface IBill {
  _id: string;
  billNumber: string;
  orderNumber: string;
  orderType: string;
  tableNumber?: string;
  tableId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: IBillItem[];
  subtotal: number;
  tax: number;
  taxRate?: number;
  discount?: number;
  discountType?: string;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  paidAmount?: number;
  changeAmount?: number;
  notes?: string;
  createdAt: string;
  generatedBy?: string;
  generatedByName?: string;
}

/* ─── Constants ───────────────────────────────────────────────── */
const ORDER_TYPE_CFG: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  'dine-in':  { label: 'Dine In',  Icon: Coffee,      color: '#f97316', bg: '#fff7ed' },
  'takeaway': { label: 'Takeaway', Icon: ShoppingBag, color: '#8b5cf6', bg: '#f5f3ff' },
  'delivery': { label: 'Delivery', Icon: Truck,       color: '#0ea5e9', bg: '#f0f9ff' },
};

const groupByRound = (items: IBillItem[]) => {
  const map: Record<number, IBillItem[]> = {};
  items.forEach(item => {
    const r = item.roundNumber || 1;
    if (!map[r]) map[r] = [];
    map[r].push(item);
  });
  return map;
};

// Format with 2 decimal places
const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─── Info Row Component ──────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, accent = '#9ca3af' }: { icon: any; label: string; value: string; accent?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-dashed border-gray-100 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}12` }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
      <div className="flex-1 flex justify-between items-center min-w-0">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide shrink-0">{label}</span>
        <span className="text-sm font-semibold text-gray-800 text-right ml-3 truncate">{value}</span>
      </div>
    </div>
  );
}

/* ─── Round Section Component ──────────────────────────────────── */
function RoundSection({ round, items }: { round: string; items: IBillItem[] }) {
  const roundTotal = items.reduce((s, i) => s + i.totalPrice, 0);
  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-[10px] font-black text-orange-600">{round}</span>
          </div>
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Round {round}</span>
        </div>
        <span className="text-xs font-bold text-orange-500">{fmt(roundTotal)}</span>
      </div>
      <div className="divide-y divide-gray-50 bg-white">
        {items.map((item, idx) => (
          <div key={idx} className="px-4 py-3 flex justify-between items-start gap-3 hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-400">×{item.quantity}</span>
                <p className="text-sm font-semibold text-gray-800 truncate">{item.productName}</p>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-[11px] text-gray-400">{fmt(item.unitPrice)} each</span>
                {item.personName && item.personName !== 'Common' && (
                  <span className="text-[11px] text-orange-500 font-medium">👤 {item.personName}</span>
                )}
              </div>
              {item.notes && (
                <p className="text-[11px] text-blue-500 mt-0.5">📝 {item.notes}</p>
              )}
            </div>
            <span className="text-sm font-bold text-gray-900 shrink-0">{fmt(item.totalPrice)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Export to PDF function ──────────────────────────────────── */
const exportToPDF = async (billData: IBill, orderData?: any) => {
  const items = orderData?.items || billData.items || [];
  if (items.length === 0) {
    toast.error('No items to export');
    return;
  }
  
  const byRound = groupByRound(items);
  const typeCfg = ORDER_TYPE_CFG[billData.orderType] || ORDER_TYPE_CFG['dine-in'];

  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.padding = '40px';
  tempDiv.style.fontFamily = "'DM Sans', sans-serif";
  
  tempDiv.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 32px; font-weight: bold; color: #f97316; margin: 0;">INVOICE</h1>
            <p style="color: #6b7280; margin-top: 5px;">Restaurant POS System</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">Bill Number</p>
            <p style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 5px 0;">${billData.billNumber || 'N/A'}</p>
            <p style="font-size: 11px; color: #9ca3af;">Date: ${billData.createdAt ? new Date(billData.createdAt).toLocaleString() : new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div>
          <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px;">Bill To:</h3>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
            <p style="font-weight: 500; color: #1f2937; margin: 0;">${billData.customerName || 'Guest Customer'}</p>
            <p style="font-size: 13px; color: #6b7280; margin: 5px 0 0;">Order Type: ${typeCfg.label}</p>
            ${billData.tableNumber ? `<p style="font-size: 13px; color: #6b7280; margin: 5px 0 0;">Table: ${billData.tableNumber}</p>` : ''}
          </div>
        </div>
        <div>
          <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px;">Order Details:</h3>
          <div style="background: #f9fafb; border-radius: 8px; padding: 12px;">
            <p style="font-size: 13px; color: #4b5563; margin: 0;">Order Number: #${billData.orderNumber || 'N/A'}</p>
            <p style="font-size: 13px; color: #4b5563; margin-top: 5px;">Payment Status: 
              <span style="background: ${billData.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7'}; color: ${billData.paymentStatus === 'paid' ? '#065f46' : '#92400e'}; padding: 2px 8px; border-radius: 20px; font-size: 11px; margin-left: 5px;">
                ${(billData.paymentStatus || 'pending').toUpperCase()}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 30px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 15px;">Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f9fafb;">
            <tr>
              <th style="padding: 10px; text-align: left; font-size: 12px; font-weight: 500; color: #6b7280;">Item</th>
              <th style="padding: 10px; text-align: center; font-size: 12px; font-weight: 500; color: #6b7280;">Qty</th>
              <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 500; color: #6b7280;">Unit Price</th>
              <th style="padding: 10px; text-align: right; font-size: 12px; font-weight: 500; color: #6b7280;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(byRound).map(([r, ritems]) => `
              <tr style="background: #fef3c7;">
                <td colspan="4" style="padding: 8px 10px; font-size: 11px; font-weight: bold; color: #d97706;">Round ${r}</td>
              </tr>
              ${(ritems as IBillItem[]).map((item: IBillItem) => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px; font-size: 13px; color: #1f2937;">${item.productName}${item.personName && item.personName !== 'Common' ? `<br/><span style="font-size: 10px; color: #f97316;">👤 ${item.personName}</span>` : ''}${item.notes ? `<br/><span style="font-size: 10px; color: #3b82f6;">📝 ${item.notes}</span>` : ''}</td>
                  <td style="padding: 10px; text-align: center; font-size: 13px; color: #4b5563;">${item.quantity}</td>
                  <td style="padding: 10px; text-align: right; font-size: 13px; color: #4b5563;">${fmt(item.unitPrice)}</td>
                  <td style="padding: 10px; text-align: right; font-size: 13px; font-weight: 500; color: #1f2937;">${fmt(item.totalPrice)}</td>
                </tr>
              `).join('')}
            `).join('')}
          </tbody>
          <tfoot style="border-top: 2px solid #e5e7eb;">
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: 600; color: #374151;">Subtotal:</td>
              <td style="padding: 10px; text-align: right; font-weight: 600; color: #1f2937;">${fmt(billData.subtotal || 0)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-size: 12px; color: #6b7280;">Tax (${billData.taxRate || 5}%):</td>
              <td style="padding: 8px; text-align: right; font-size: 12px; color: #4b5563;">${fmt(billData.tax || 0)}</td>
            </tr>
            ${billData.discount ? `
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-size: 12px; color: #059669;">Discount:</td>
              <td style="padding: 8px; text-align: right; font-size: 12px; color: #059669;">-${fmt(billData.discount)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #e5e7eb;">
              <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #1f2937;">Total:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 20px; color: #f97316;">${fmt(billData.total || 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; margin-bottom: 20px; border: 1px solid #d1fae5;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #16a34a;">✓</span>
            <span style="font-weight: bold; color: #065f46;">Paid via ${(billData.paymentMethod || 'CASH').toUpperCase()}</span>
          </div>
          <span style="font-weight: bold; color: #065f46;">${fmt(billData.paidAmount || billData.total || 0)}</span>
        </div>
        ${(billData.changeAmount || 0) > 0 ? `<p style="font-size: 11px; color: #059669; margin-top: 8px; margin-left: 24px;">Change returned: ${fmt(billData.changeAmount!)}</p>` : ''}
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        <p style="font-size: 13px; color: #6b7280;">Thank you for dining with us!</p>
        <p style="font-size: 11px; color: #9ca3af; margin-top: 5px;">This is a computer-generated invoice. No signature required.</p>
        <p style="font-size: 10px; color: #cbd5e1; margin-top: 10px;">GST: 22AAAAA0000A1Z5 | FSSAI: 12345678901234</p>
      </div>
    </div>
  `;

  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`invoice_${billData.billNumber || 'bill'}.pdf`);
    
    toast.success('Invoice downloaded successfully!');
  } catch (error) {
    console.error('PDF generation error:', error);
    toast.error('Failed to generate PDF');
  } finally {
    document.body.removeChild(tempDiv);
  }
};

/* ─── Print Function ──────────────────────────────────── */
function doPrint(billData: IBill, orderData?: any) {
  const items = orderData?.items || billData.items || [];
  if (items.length === 0) {
    toast.error('No items to print');
    return;
  }
  
  const byRound = groupByRound(items);
  const typeCfg = ORDER_TYPE_CFG[billData.orderType] || ORDER_TYPE_CFG['dine-in'];

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8">
    <title>Invoice ${billData.billNumber}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;900&display=swap');
      *{margin:0;padding:0;box-sizing:border-box}
      body{
        font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;
        background:#f8f7f4;
        min-height:100vh;
        display:flex;
        align-items:flex-start;
        justify-content:center;
        padding:30px 16px;
      }
      .print-wrap{width:100%;max-width:400px}
      .print-card{background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08)}
      .print-header{background:#1c1917;padding:28px 24px 24px;text-align:center}
      .print-rname{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px}
      .print-tagline{font-size:11px;color:#a8a29e;margin-top:4px;letter-spacing:2px;text-transform:uppercase}
      .print-bnum{margin-top:14px;display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:30px;padding:4px 14px;font-family:monospace;font-size:11px;color:#e5e5e5}
      .print-type-badge{margin-top:10px;display:inline-flex;align-items:center;gap:6px;background:${typeCfg.color}20;border:1px solid ${typeCfg.color}40;border-radius:20px;padding:3px 10px}
      .print-type-badge span{font-size:11px;font-weight:700;color:${typeCfg.color}}
      .print-body{padding:20px}
      .print-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px}
      .print-info-box{background:#f8f7f4;border-radius:12px;padding:10px 12px}
      .print-info-lbl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;font-weight:700}
      .print-info-val{font-size:13px;font-weight:700;color:#1c1917;margin-top:3px}
      .print-section-title{font-size:10px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
      .print-round-block{margin-bottom:12px;border-radius:14px;overflow:hidden;border:1px solid #f0ede8}
      .print-round-head{background:#faf9f7;padding:8px 14px;display:flex;justify-content:space-between;align-items:center}
      .print-round-head-l{font-size:10px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px}
      .print-round-head-r{font-size:11px;font-weight:700;color:#f97316}
      .print-item-row{display:flex;justify-content:space-between;padding:8px 14px;border-bottom:1px solid #f8f7f4}
      .print-item-row:last-child{border-bottom:none}
      .print-item-left .print-iname{font-size:12px;font-weight:600;color:#334155}
      .print-imeta{font-size:10px;color:#9ca3af;margin-top:2px}
      .print-item-price{font-size:12px;font-weight:700;color:#1c1917}
      .print-divider{border:none;border-top:1px dashed #e5e7eb;margin:16px 0}
      .print-totals{background:#faf9f7;border-radius:14px;padding:14px}
      .print-trow{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#6b7280}
      .print-trow-val{color:#1c1917;font-weight:500}
      .print-grand{margin-top:10px;padding-top:10px;border-top:2px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
      .print-grand-lbl{font-size:14px;font-weight:900;color:#1c1917}
      .print-grand-val{font-size:20px;font-weight:900;color:#f97316}
      .print-pay-box{margin-top:14px;background:#f0fdf4;border:1px solid #d1fae5;border-radius:14px;padding:12px;text-align:center}
      .print-pay-status{font-size:12px;font-weight:700;color:#16a34a;margin-bottom:4px}
      .print-pay-meta{font-size:11px;color:#6b7280}
      .print-footer{text-align:center;padding:18px;background:#faf9f7;border-top:1px dashed #e5e7eb}
      .print-footer p{font-size:10px;color:#9ca3af;line-height:1.8}
      @media print{body{background:#fff;padding:0}.print-card{box-shadow:none;border-radius:0}}
    </style>
  </head><body><div class="print-wrap"><div class="print-card">
    <div class="print-header">
      <div class="print-rname">✦ RESTAURANT NAME</div>
      <div class="print-tagline">Tax Invoice</div>
      <div class="print-bnum">${billData.billNumber}</div><br/>
      <div class="print-type-badge"><span>${typeCfg.label.toUpperCase()}</span></div>
    </div>
    <div class="print-body">
      <div class="print-info-grid">
        <div class="print-info-box"><div class="print-info-lbl">Order #</div><div class="print-info-val">#${billData.orderNumber}</div></div>
        <div class="print-info-box"><div class="print-info-lbl">Date</div><div class="print-info-val">${billData.createdAt ? new Date(billData.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div></div>
        <div class="print-info-box"><div class="print-info-lbl">Time</div><div class="print-info-val">${billData.createdAt ? new Date(billData.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div></div>
        ${billData.tableNumber ? `<div class="print-info-box"><div class="print-info-lbl">Table</div><div class="print-info-val">Table ${billData.tableNumber}</div></div>` : ''}
        ${billData.customerName ? `<div class="print-info-box"><div class="print-info-lbl">Customer</div><div class="print-info-val">${billData.customerName}</div></div>` : ''}
        ${billData.customerPhone ? `<div class="print-info-box"><div class="print-info-lbl">Phone</div><div class="print-info-val">${billData.customerPhone}</div></div>` : ''}
      </div>
      <div class="print-section-title">Order Items</div>
      ${Object.entries(byRound).map(([r, ritems]) => `
        <div class="print-round-block">
          <div class="print-round-head">
            <span class="print-round-head-l">Round ${r}</span>
            <span class="print-round-head-r">${fmt((ritems as IBillItem[]).reduce((s, i) => s + i.totalPrice, 0))}</span>
          </div>
          ${(ritems as IBillItem[]).map(item => `
            <div class="print-item-row">
              <div class="print-item-left">
                <div class="print-iname">×${item.quantity} ${item.productName}</div>
                <div class="print-imeta">${fmt(item.unitPrice)} each${item.personName && item.personName !== 'Common' ? ` · ${item.personName}` : ''}</div>
                ${item.notes ? `<div class="print-imeta" style="color:#f59e0b">📝 ${item.notes}</div>` : ''}
              </div>
              <div class="print-item-price">${fmt(item.totalPrice)}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
      <hr class="print-divider">
      <div class="print-totals">
        <div class="print-trow"><span>Subtotal</span><span class="print-trow-val">${fmt(billData.subtotal || 0)}</span></div>
        <div class="print-trow"><span>GST (${billData.taxRate || 5}%)</span><span class="print-trow-val">${fmt(billData.tax || 0)}</span></div>
        ${billData.discount ? `<div class="print-trow"><span>Discount</span><span class="print-trow-val" style="color:#16a34a">-${fmt(billData.discount)}</span></div>` : ''}
        <div class="print-grand"><span class="print-grand-lbl">Total</span><span class="print-grand-val">${fmt(billData.total || 0)}</span></div>
      </div>
      <div class="print-pay-box">
        <div class="print-pay-status">✓ Payment ${billData.paymentStatus === 'paid' ? 'Successful' : 'Pending'}</div>
        <div class="print-pay-meta">${(billData.paymentMethod || 'CASH').toUpperCase()} · Paid ${fmt(billData.paidAmount || billData.total || 0)}</div>
        ${(billData.changeAmount || 0) > 0 ? `<div class="print-pay-meta">Change returned: ${fmt(billData.changeAmount!)}</div>` : ''}
      </div>
    </div>
    <div class="print-footer">
      <p>Thank you for visiting!</p>
      <p>GST: 22AAAAA0000A1Z5 | FSSAI: 12345678901234</p>
    </div>
  </div></div></body></html>`);
  win.document.close();
  win.print();
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT - Dashboard-style UI
═══════════════════════════════════════════════════════════════ */
export default function BillDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { billId } = useParams<{ billId: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [bill, setBill] = useState<IBill | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receivedAmount, setReceivedAmount] = useState(0);

  console.log('🔍 BillDetailPage render - billId:', billId, 'orderId:', orderId);

  useEffect(() => {
    console.log('🔍 BillDetailPage useEffect - billId:', billId, 'orderId:', orderId);
    
    if (billId) {
      console.log('✅ Fetching bill by ID:', billId);
      fetchBillById(billId);
      return;
    }
    
    if (orderId) {
      console.log('✅ Fetching order and bill for orderId:', orderId);
      fetchOrderAndBill(orderId);
      return;
    }
    
    if (location.state?.bill) {
      console.log('📦 Using bill from location state');
      const billData = location.state.bill;
      setBill(billData);
      setReceivedAmount(billData.total || 0);
      setLoading(false);
      return;
    }
    
    if (location.state?.billId) {
      console.log('📦 Using billId from location state:', location.state.billId);
      fetchBillById(location.state.billId);
      return;
    }
    
    console.error('❌ No bill ID or order ID provided');
    setError('No bill ID or order ID provided');
    setLoading(false);
  }, [billId, orderId]);

  const fetchBillById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching bill by ID:', id);
      const res = await adminApi.get(`/bills/${id}`);
      console.log('📦 Bill response:', res.data);
      
      let billData = res.data;
      if (res.data.success) {
        billData = res.data.data || res.data;
      }
      
      console.log('📋 Bill data extracted:', billData);
      
      if (billData && billData._id) {
        setBill(billData);
        setReceivedAmount(billData.total || 0);
      } else {
        setError('Invalid bill data received');
        toast.error('Invalid bill data');
      }
    } catch (error: any) {
      console.error('Error fetching bill:', error);
      const errorMsg = error.response?.data?.error || 'Failed to load bill';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchOrderAndBill = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching order and bill for orderId:', id);
      
      const oRes = await adminApi.get(`/orders/${id}`);
      console.log('📦 Order response:', oRes.data);
      
      let orderData = oRes.data;
      if (oRes.data.success) {
        orderData = oRes.data.data || oRes.data;
      }
      
      if (orderData && orderData._id) {
        setOrder(orderData);
        setReceivedAmount(orderData.total || 0);
      } else {
        setError('Invalid order data received');
        toast.error('Invalid order data');
        setLoading(false);
        return;
      }
      
      try {
        const bRes = await adminApi.get(`/bills/by-order/${id}`);
        console.log('📦 Bill response:', bRes.data);
        
        let billData = bRes.data;
        if (bRes.data.success) {
          billData = bRes.data.data || bRes.data;
        }
        
        if (billData && billData._id) {
          setBill(billData);
          setReceivedAmount(billData.total || 0);
        } else {
          console.log('📋 No bill found for this order');
          setBill(null);
        }
      } catch (billError: any) {
        console.log('📋 No bill found for this order (404 expected)');
        if (billError.response?.status === 404) {
          setBill(null);
        } else {
          console.error('Error fetching bill:', billError);
        }
      }
    } catch (error: any) {
      console.error('Error fetching order and bill:', error);
      const errorMsg = error.response?.data?.error || 'Failed to load order';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally { 
      setLoading(false); 
    }
  };

  const generateBill = async () => {
    if (!orderId) {
      toast.error('No order ID found');
      return;
    }
    
    setProcessing(true);
    try {
      console.log('💰 Generating bill for order:', orderId);
      const res = await adminApi.post(`/bills/generate/${orderId}`);
      console.log('📦 Generate bill response:', res.data);
      
      let billData = res.data;
      if (res.data.success) {
        billData = res.data.data || res.data;
      }
      
      if (billData && billData._id) {
        setBill(billData);
        toast.success('Bill generated!');
      } else {
        toast.error('Failed to generate bill: Invalid response');
      }
    } catch (e: any) { 
      console.error('Generate bill error:', e);
      if (e.response?.status === 403) {
        toast.error('You do not have permission to generate bills. Please contact admin.');
      } else if (e.response?.status === 409) {
        try {
          const bRes = await adminApi.get(`/bills/by-order/${orderId}`);
          let billData = bRes.data;
          if (bRes.data.success) {
            billData = bRes.data.data || bRes.data;
          }
          if (billData && billData._id) {
            setBill(billData);
            toast.success('Bill already exists!');
          }
        } catch (err) {
          toast.error('Bill exists but cannot open');
        }
      } else {
        toast.error(e.response?.data?.error || 'Failed to generate bill'); 
      }
    } finally { 
      setProcessing(false); 
    }
  };

  const collectPayment = async () => {
    if (!bill) {
      toast.error('No bill found');
      return;
    }
    
    setProcessing(true);
    try {
      console.log('💰 Collecting payment for bill:', bill._id);
      const res = await adminApi.patch(`/bills/${bill._id}/payment`, {
        paymentStatus: 'paid', 
        paymentMethod,
        paidAmount: receivedAmount,
        changeAmount: Math.max(0, receivedAmount - bill.total),
      });
      
      console.log('📦 Payment response:', res.data);
      
      let updatedBill = res.data;
      if (res.data.success) {
        updatedBill = res.data.data || res.data;
      }
      
      if (updatedBill && updatedBill._id) {
        setBill(updatedBill);
        toast.success('✅ Payment collected!');
        
        localStorage.setItem('tablesNeedRefresh', Date.now().toString());
        sessionStorage.setItem('forceTableRefresh', 'true');
        
        setTimeout(() => {
          doPrint(updatedBill, order);
        }, 500);
        
        navigate('/tables', { 
          state: { 
            refresh: Date.now(),
            fromPayment: true 
          }
        });
      } else {
        toast.error('Payment failed: Invalid response');
      }
    } catch (e: any) { 
      console.error('Payment error:', e);
      toast.error(e.response?.data?.error || 'Payment failed'); 
    } finally { 
      setProcessing(false); 
    }
  };

  /* ── Error View ── */
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => navigate('/orders')} 
              className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600"
            >
              Go to Orders
            </button>
            <button 
              onClick={() => {
                if (billId) fetchBillById(billId);
                else if (orderId) fetchOrderAndBill(orderId);
                else navigate('/bills');
              }} 
              className="px-6 py-2 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-orange-500 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Loading bill details…</p>
      </div>
    </div>
  );

  if (order && !bill) {
    const activeItems = order?.items || [];
    const byRound = groupByRound(activeItems);
    const totalRounds = Object.keys(byRound).length;
    const typeCfg = ORDER_TYPE_CFG[order.orderType] || ORDER_TYPE_CFG['dine-in'];
    const TypeIcon = typeCfg.Icon;

    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Generate Bill</p>
                <p className="text-2xl font-bold">#{order.orderNumber}</p>
                <p className="text-orange-100 text-sm mt-1">{typeCfg.label} · {totalRounds} round{totalRounds !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Receipt size={24} className="text-white" />
              </div>
            </div>
          </div>

          <button onClick={generateBill} disabled={processing}
            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90">
            {processing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={18} />}
            {processing ? 'Generating...' : 'Generate Bill'}
          </button>
        </div>
      </div>
    );
  }

  if (!bill && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No bill or order found</p>
          <p className="text-sm text-gray-400 mb-4">Please check the URL or go back to orders</p>
          <button onClick={() => navigate('/orders')} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600">
            Go to Orders
          </button>
        </div>
      </div>
    );
  }

  const activeItems = (order?.items || bill?.items || []) as IBillItem[];
  const byRound = groupByRound(activeItems);
  const totalRounds = Object.keys(byRound).length;
  const displayOrder = order || bill;
  const typeCfg = ORDER_TYPE_CFG[displayOrder?.orderType] || ORDER_TYPE_CFG['dine-in'];
  const TypeIcon = typeCfg.Icon;

  /* ═══════════════════════════════════════════════════════
     ✅ KEY FIX: Changed from === 'paid' to !== 'paid'
     PAID RECEIPT VIEW - Dashboard Style
  ═══════════════════════════════════════════════════════ */
  if (bill && bill.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm">
              <ArrowLeft size={16} /> Back
            </button>
            <button 
              onClick={() => exportToPDF(bill, order)} 
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all"
            >
              <Download size={14} /> Export PDF
            </button>
          </div>

          {/* Success Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-5 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
              <CheckCircle size={24} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-lg">Payment Received</p>
              <p className="text-green-600 text-sm">{bill.billNumber} · {bill.paymentMethod?.toUpperCase()}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-bold text-green-800 text-2xl">{fmt(bill.total)}</p>
              {(bill.changeAmount || 0) > 0 && <p className="text-green-600 text-xs">Change: {fmt(bill.changeAmount!)}</p>}
            </div>
          </div>

          {/* Bill Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tax Invoice</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">#{bill.orderNumber}</p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${typeCfg.color}12`, color: typeCfg.color }}>
                    <TypeIcon size={12} /> {typeCfg.label}
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-1">{bill.billNumber}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Calendar, label: 'Date', value: bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A' },
                  { icon: Clock, label: 'Time', value: bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A' },
                  ...(bill.tableNumber ? [{ icon: MapPin, label: 'Table', value: `Table ${bill.tableNumber}` }] : []),
                  ...(bill.customerName ? [{ icon: Users, label: 'Customer', value: bill.customerName }] : []),
                  { icon: Utensils, label: 'Rounds', value: `${totalRounds} round${totalRounds !== 1 ? 's' : ''}` },
                ].map((info, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <info.icon size={11} className="text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{info.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{info.value}</p>
                  </div>
                ))}
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Items</p>
                  <span className="text-[10px] font-bold text-gray-400">{activeItems.reduce((s, i) => s + i.quantity, 0)} items</span>
                </div>
                {Object.entries(byRound).map(([r, items]) => (
                  <RoundSection key={r} round={r} items={items} />
                ))}
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-2xl p-5 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-800">{fmt(bill.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">GST ({bill.taxRate || 5}%)</span>
                  <span className="font-semibold text-gray-800">{fmt(bill.tax)}</span>
                </div>
                {(bill.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-semibold text-green-600">-{fmt(bill.discount!)}</span>
                  </div>
                )}
                <div className="pt-3 mt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="font-bold text-orange-500 text-2xl">{fmt(bill.total)}</span>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="font-bold text-green-800 text-sm">Paid via {bill.paymentMethod?.toUpperCase()}</span>
                  </div>
                  <span className="font-bold text-green-800">{fmt(bill.paidAmount || bill.total)}</span>
                </div>
                {(bill.changeAmount || 0) > 0 && (
                  <p className="text-xs text-green-600 mt-2 ml-6">Change returned: {fmt(bill.changeAmount!)}</p>
                )}
              </div>

              {/* Notes */}
              {bill.notes && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-amber-800">{bill.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => doPrint(bill, order)} className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-900 transition-all">
                  <Printer size={16} /> Print Receipt
                </button>
                <button onClick={() => navigate('/orders')} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600 transition-all">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     ✅ KEY FIX: Changed from === 'pending' to !== 'paid'
     PENDING PAYMENT VIEW - Dashboard Style
  ═══════════════════════════════════════════════════════ */
  if (bill && bill.paymentStatus !== 'paid') {
    const change = receivedAmount - bill.total;
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-gray-600 mb-6">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Amount Due Card */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-1">Amount Due</p>
                <p className="text-4xl font-bold">{fmt(bill.total)}</p>
                <p className="text-orange-100 text-sm mt-1">#{bill.orderNumber} · {typeCfg.label}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <TypeIcon size={24} className="text-white" />
              </div>
            </div>
          </div>

          {/* Bill Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill Details</p>
            </div>
            <div className="px-5 py-2">
              <InfoRow icon={Hash} label="Bill No" value={bill.billNumber} accent="#8b5cf6" />
              <InfoRow icon={Hash} label="Order No" value={`#${bill.orderNumber}`} accent="#6366f1" />
              <InfoRow icon={Calendar} label="Date" value={bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} accent="#0ea5e9" />
              <InfoRow icon={Clock} label="Time" value={bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} accent="#10b981" />
              <InfoRow icon={TypeIcon} label="Type" value={typeCfg.label} accent={typeCfg.color} />
              {bill.tableNumber && <InfoRow icon={MapPin} label="Table" value={`Table ${bill.tableNumber}`} accent="#f97316" />}
              {bill.customerName && <InfoRow icon={Users} label="Customer" value={bill.customerName} accent="#8b5cf6" />}
              <InfoRow icon={Utensils} label="Rounds" value={`${totalRounds} round${totalRounds !== 1 ? 's' : ''}`} accent="#f59e0b" />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Order Items</p>
              <span className="text-xs font-bold text-gray-400">{activeItems.reduce((s, i) => s + i.quantity, 0)} items</span>
            </div>
            <div className="p-4">
              {Object.entries(byRound).map(([r, items]) => <RoundSection key={r} round={r} items={items} />)}
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold text-gray-800">{fmt(bill.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">GST ({bill.taxRate || 5}%)</span><span className="font-semibold text-gray-800">{fmt(bill.tax)}</span></div>
              {(bill.discount || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="font-semibold text-green-600">-{fmt(bill.discount!)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-gray-200"><span className="font-bold text-gray-900">Total</span><span className="font-bold text-orange-500 text-xl">{fmt(bill.total)}</span></div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Select Payment Method</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'cash', label: 'Cash', Icon: Wallet, color: '#16a34a', bg: '#f0fdf4' },
                { id: 'card', label: 'Card', Icon: CreditCard, color: '#2563eb', bg: '#eff6ff' },
                { id: 'upi', label: 'UPI', Icon: Smartphone, color: '#7c3aed', bg: '#f5f3ff' },
              ].map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all ${paymentMethod === m.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                  <m.Icon size={20} className={paymentMethod === m.id ? 'text-orange-500' : 'text-gray-400'} />
                  <span className={`text-xs font-bold ${paymentMethod === m.id ? 'text-orange-600' : 'text-gray-500'}`}>{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="mt-5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Amount Received</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input type="number" step="1" value={receivedAmount}
                    onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                {change > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-sm font-bold text-green-700">Change to return: {fmt(change)}</span>
                  </div>
                )}
                {change < 0 && receivedAmount > 0 && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-sm font-bold text-amber-700">Remaining: {fmt(Math.abs(change))}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="mt-5 p-4 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <Smartphone size={28} className="mx-auto text-purple-500 mb-2" />
                <p className="text-sm font-bold text-purple-700">restaurant@okhdfcbank</p>
                <p className="text-xs text-purple-400 mt-1">Scan QR or share UPI ID</p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="mt-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <CreditCard size={28} className="mx-auto text-blue-500 mb-2" />
                <p className="text-sm font-bold text-blue-700">Swipe / Tap card on POS machine</p>
                <p className="text-xs text-blue-400 mt-1">Amount: {fmt(bill.total)}</p>
              </div>
            )}
          </div>

          <button onClick={collectPayment} disabled={processing || (paymentMethod === 'cash' && receivedAmount < bill.total)}
            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-40 bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90">
            {processing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={18} />}
            {processing ? 'Processing...' : `Collect ${fmt(bill.total)}`}
          </button>
        </div>
      </div>
    );
  }

  // Fallback - this should never be reached now
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-2">Unable to load bill</p>
        <p className="text-sm text-gray-400 mb-4">Bill status: {bill?.paymentStatus || 'unknown'}</p>
        <button onClick={() => navigate('/orders')} className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold text-sm hover:bg-orange-600">
          Go to Orders
        </button>
      </div>
    </div>
  );
}