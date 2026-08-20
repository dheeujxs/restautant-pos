// ❌ Remove this line:
// import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;  // ✅ Use React.ElementType instead
    gradient: string;
    change?: string;
  }
  
  export default function StatCard({ title, value, icon: Icon, gradient, change }: StatCardProps) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-all">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-stone-500">{title}</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
            {change && <p className="text-xs text-green-600 mt-2">{change}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
            <Icon size={20} color="white" />
          </div>
        </div>
      </div>
    );
  }