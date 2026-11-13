import React, { useState, useMemo } from 'react';
import { BarChart3, X } from 'lucide-react';
import { AlvField } from '../types/sap';

interface SapBusinessGraphicModalProps {
  isOpen: boolean;
  title: string;
  fieldCatalog: AlvField[];
  rows: Record<string, any>[];
  onClose: () => void;
}

export const SapBusinessGraphicModal: React.FC<SapBusinessGraphicModalProps> = ({
  isOpen,
  title,
  fieldCatalog,
  rows,
  onClose,
}) => {
  const numericFields = useMemo(
    () =>
      fieldCatalog.filter(
        (f) =>
          f.do_sum ||
          f.datatype === 'CURR' ||
          f.datatype === 'DEC' ||
          f.datatype === 'INT4'
      ),
    [fieldCatalog]
  );

  const labelFields = useMemo(
    () =>
      fieldCatalog.filter(
        (f) =>
          !f.checkbox &&
          f.fieldname !== 'ZICON' &&
          f.fieldname !== 'LIGHTS' &&
          f.fieldname !== 'STATUS' &&
          f.datatype !== 'CURR' &&
          f.datatype !== 'DEC'
      ),
    [fieldCatalog]
  );

  const [metricField, setMetricField] = useState<string>(
    numericFields[0]?.fieldname || ''
  );
  const [groupField, setGroupField] = useState<string>(
    labelFields.find((f) => !f.key)?.fieldname || labelFields[0]?.fieldname || ''
  );

  const activeMetric = metricField || numericFields[0]?.fieldname || '';
  const activeGroup = groupField || labelFields[0]?.fieldname || '';

  const chartData = useMemo(() => {
    if (!activeMetric || !activeGroup) return [];
    const grouped = new Map<string, number>();
    rows.forEach((row) => {
      const label = String(row[activeGroup] ?? '(Blank)').trim() || '(Blank)';
      const rawVal = Number(String(row[activeMetric] ?? '0').replace(/,/g, '')) || 0;
      grouped.set(label, (grouped.get(label) || 0) + rawVal);
    });
    return Array.from(grouped.entries())
      .map(([label, value]) => ({ label, value }))
      .slice(0, 10);
  }, [rows, activeMetric, activeGroup]);

  if (!isOpen) return null;

  const maxVal = Math.max(...chartData.map((d) => Math.abs(d.value)), 1);
  const metricColText =
    fieldCatalog.find((f) => f.fieldname === activeMetric)?.coltext || activeMetric;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded border border-slate-400 bg-[#ECE9D8] shadow-2xl text-slate-800 text-xs font-sans overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#2B547E] to-[#4863A0] px-3 py-1.5 text-white font-medium">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-sky-200" />
            <span>SAP Business Graphics - {title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Axis selectors */}
          <div className="flex items-center gap-4 bg-white border border-slate-300 p-2.5">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-slate-700 shrink-0">Category (X):</span>
              <select
                value={activeGroup}
                onChange={(e) => setGroupField(e.target.value)}
                className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs"
              >
                {labelFields.map((f) => (
                  <option key={f.fieldname} value={f.fieldname}>
                    {f.coltext} ({f.fieldname})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <span className="font-semibold text-slate-700 shrink-0">Metric (Y):</span>
              <select
                value={activeMetric}
                onChange={(e) => setMetricField(e.target.value)}
                className="flex-1 bg-white border border-slate-400 px-2 py-1 text-xs"
              >
                {numericFields.map((f) => (
                  <option key={f.fieldname} value={f.fieldname}>
                    {f.coltext} ({f.fieldname})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chart area */}
          <div className="bg-white border border-slate-400 p-4">
            {chartData.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No numeric metric columns available to render chart.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-700">
                  {metricColText} by {fieldCatalog.find((f) => f.fieldname === activeGroup)?.coltext || activeGroup}
                </div>
                <div className="space-y-2">
                  {chartData.map((d, idx) => {
                    const pct = Math.max(4, Math.round((Math.abs(d.value) / maxVal) * 100));
                    const colors = [
                      'bg-blue-600',
                      'bg-emerald-600',
                      'bg-amber-500',
                      'bg-indigo-600',
                      'bg-cyan-600',
                    ];
                    return (
                      <div key={d.label} className="grid grid-cols-[150px_1fr_100px] items-center gap-2">
                        <span className="truncate text-right font-medium text-slate-700" title={d.label}>
                          {d.label}
                        </span>
                        <div className="h-5 bg-slate-100 border border-slate-200 overflow-hidden">
                          <div
                            className={`h-full ${colors[idx % colors.length]} transition-all duration-300`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-right text-slate-900">
                          {d.value.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-300 bg-[#E3E1D4] px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-[11px] text-slate-700 bg-[#ECE9D8] border border-slate-400 hover:bg-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
