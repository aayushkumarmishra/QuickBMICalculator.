import React from 'react';
import { BarChart3, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-ink text-canvas text-[9px] font-mono font-black uppercase tracking-[0.2em] shadow-premium-sm">Advanced Analytics</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
            <Zap className="w-3 h-3 text-blue-500" />
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">GPU Accelerated</span>
          </div>
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-ink leading-tight">Insight Engine.</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-canvas border border-hairline rounded-[2.5rem] p-12 shadow-premium-lg relative overflow-hidden group">
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <h3 className="text-xl font-black tracking-tight text-ink">Growth Trajectory</h3>
                 <p className="text-xs text-mute opacity-60">Visualizing platform expansion and user retention.</p>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-ink">Processing Data</span>
               </div>
            </div>

            {/* Skeleton Chart */}
            <div className="h-64 flex items-end justify-between gap-3 opacity-10 grayscale group-hover:grayscale-0 group-hover:opacity-20 transition-all duration-700">
               {[60, 80, 45, 90, 65, 85, 40, 75, 55, 95, 70, 88].map((h, i) => (
                 <motion.div 
                   key={i}
                   initial={{ height: 0 }}
                   animate={{ height: `${h}%` }}
                   transition={{ delay: i * 0.05, duration: 1 }}
                   className="flex-1 bg-ink rounded-t-xl" 
                 />
               ))}
            </div>

            <div className="pt-8 border-t border-hairline text-center">
               <p className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Analytics Hub provisionally available in v2.4.0</p>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/[0.03] to-transparent blur-3xl pointer-events-none" />
        </div>

        <div className="space-y-8">
          <div className="bg-ink text-canvas rounded-[2.5rem] p-10 shadow-premium-2xl relative overflow-hidden group">
             <div className="relative z-10 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                   <TrendingUp className="w-6 h-6 text-status-healthy" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-black tracking-tight">Predictive Modeling</h4>
                  <p className="text-xs text-canvas/40 leading-relaxed">AI-driven forecasts for user registration and report generation volume.</p>
                </div>
                <div className="pt-4">
                   <span className="text-[9px] font-mono font-black text-status-healthy uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 border border-white/10">In Development</span>
                </div>
             </div>
             <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/10 to-transparent blur-2xl opacity-50" />
          </div>

          <div className="bg-canvas border border-hairline rounded-[2.5rem] p-8 shadow-premium-sm space-y-6">
             <h4 className="text-[10px] font-mono font-black text-mute uppercase tracking-[0.3em]">Module Status</h4>
             <div className="space-y-4">
                {[
                  { label: 'Core Metrics', status: 'Ready' },
                  { label: 'Retention Analysis', status: 'Pending' },
                  { label: 'Behavioral Mapping', status: 'Drafting' }
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink/60">{m.label}</span>
                    <span className="text-[9px] font-mono font-black uppercase text-mute opacity-40">{m.status}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
