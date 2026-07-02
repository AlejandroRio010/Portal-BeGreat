"use client";

import { useState, useCallback } from "react";

interface Template {
  id: string;
  nombre: string;
  tipo: "simple" | "anual" | "trimestral";
  parent_id: string | null;
  orden: number;
}

interface CustomItem {
  id: string;
  nombre: string;
  tipo: "simple" | "anual" | "trimestral";
  orden: number;
}

interface Entry {
  id: string;
  template_id: string | null;
  custom_item_id: string | null;
  year: number | null;
  quarter: number | null;
  checked: boolean;
}

interface Props {
  entityType: "cliente" | "proveedor" | "avalista";
  entityId: string;
  templates: Template[];
  customItems: CustomItem[];
  entries: Entry[];
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2023 + 1 }, (_, i) => 2023 + i);
const QUARTERS = [1, 2, 3, 4];
const Q_LABELS = ["T1", "T2", "T3", "T4"];

const CHECK_ON = "bg-emerald-500 border-emerald-500";
const CHECK_OFF = "border-gray-300 hover:border-[#2E1A47]";
const CheckSvg = ({ size = "w-3.5 h-3.5" }: { size?: string }) => (
  <svg className={`${size} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
);
const ChevronSvg = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
);

export default function DocChecklistPanel({ entityType, entityId, templates, customItems: initialCustom, entries: initialEntries }: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [customItems, setCustomItems] = useState<CustomItem[]>(initialCustom);
  const [panelOpen, setPanelOpen] = useState(false);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [addingItem, setAddingItem] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTipo, setNewTipo] = useState<"simple" | "anual" | "trimestral">("simple");
  const [saving, setSaving] = useState<string | null>(null);

  const rootTemplates = templates.filter(t => !t.parent_id);
  const childrenOf = (parentId: string) => templates.filter(t => t.parent_id === parentId).sort((a, b) => a.orden - b.orden);
  const hasChildren = (id: string) => templates.some(t => t.parent_id === id);

  const isChecked = useCallback((templateId: string | null, customItemId: string | null, year?: number, quarter?: number) => {
    return entries.some(e =>
      e.template_id === templateId &&
      e.custom_item_id === customItemId &&
      e.year === (year ?? null) &&
      e.quarter === (quarter ?? null) &&
      e.checked
    );
  }, [entries]);

  function countCheckedForTree(id: string): number {
    const children = childrenOf(id);
    if (children.length === 0) {
      return entries.filter(e => e.template_id === id && e.checked).length;
    }
    return children.reduce((sum, c) => sum + countCheckedForTree(c.id), 0);
  }

  function hasAnyCheckInTree(id: string): boolean {
    const children = childrenOf(id);
    if (children.length === 0) {
      return entries.some(e => e.template_id === id && e.checked);
    }
    return children.some(c => hasAnyCheckInTree(c.id));
  }

  async function toggle(templateId: string | null, customItemId: string | null, year?: number, quarter?: number) {
    const key = `${templateId ?? customItemId}-${year ?? ""}-${quarter ?? ""}`;
    setSaving(key);
    const currentlyChecked = isChecked(templateId, customItemId, year, quarter);
    const newChecked = !currentlyChecked;

    setEntries(prev => {
      const idx = prev.findIndex(e =>
        e.template_id === templateId &&
        e.custom_item_id === customItemId &&
        e.year === (year ?? null) &&
        e.quarter === (quarter ?? null)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], checked: newChecked };
        return copy;
      }
      return [...prev, { id: "temp", template_id: templateId, custom_item_id: customItemId, year: year ?? null, quarter: quarter ?? null, checked: newChecked }];
    });

    await fetch("/api/doc-checklist/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        template_id: templateId,
        custom_item_id: customItemId,
        year: year ?? null,
        quarter: quarter ?? null,
        checked: newChecked,
      }),
    });
    setSaving(null);
  }

  async function addCustomItem() {
    if (!newName.trim()) return;
    const res = await fetch("/api/doc-checklist/custom-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, nombre: newName.trim(), tipo: newTipo }),
    });
    const item = await res.json();
    setCustomItems(prev => [...prev, item]);
    setNewName("");
    setNewTipo("simple");
    setAddingItem(false);
  }

  async function deleteCustomItem(id: string) {
    await fetch("/api/doc-checklist/custom-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setEntries(prev => prev.filter(e => e.custom_item_id !== id));
  }

  function toggleOpen(id: string) {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function countChecked(templateId: string | null, customItemId: string | null) {
    return entries.filter(e =>
      e.template_id === templateId &&
      e.custom_item_id === customItemId &&
      e.checked
    ).length;
  }

  function renderSimpleCheck(templateId: string | null, customItemId: string | null, label: string, indent: number, onDelete?: () => void) {
    const checked = isChecked(templateId, customItemId);
    const key = `${templateId ?? customItemId}--`;
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 group" style={{ paddingLeft: 12 + indent * 20 }}>
        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
          <button type="button" onClick={() => toggle(templateId, customItemId)}
            disabled={saving === key}
            className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? CHECK_ON : CHECK_OFF}`}>
            {checked && <CheckSvg size="w-3 h-3" />}
          </button>
          <span className={`text-xs ${checked ? "text-gray-500 line-through" : "text-gray-800"}`}>{label}</span>
        </label>
        {onDelete && (
          <button onClick={onDelete}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs ml-2">✕</button>
        )}
      </div>
    );
  }

  function renderTemplate(item: Template, indent: number = 0): React.ReactNode {
    const children = childrenOf(item.id);
    const isOpen = openItems[item.id];

    // Leaf node with no children: render based on tipo
    if (children.length === 0 && item.tipo === "simple") {
      return <div key={item.id}>{renderSimpleCheck(item.id, null, item.nombre, indent)}</div>;
    }

    // Has children OR is anual/trimestral: render as collapsible
    const total = children.length > 0 ? countCheckedForTree(item.id) : countChecked(item.id, null);
    const anyCheck = children.length > 0 ? hasAnyCheckInTree(item.id) : entries.some(e => e.template_id === item.id && e.checked);

    return (
      <div key={item.id} className="border-b border-gray-50 last:border-0">
        <button onClick={() => toggleOpen(item.id)}
          className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 transition-colors text-left"
          style={{ paddingLeft: 12 + indent * 20 }}>
          <div className="flex items-center gap-2.5">
            <div className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 ${anyCheck ? CHECK_ON : "border-gray-300"}`}>
              {anyCheck && total > 0 && <span className="text-[7px] font-bold text-white">{total}</span>}
            </div>
            <span className="text-xs text-gray-800 font-medium">{item.nombre}</span>
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && <span className="text-[10px] text-emerald-600 font-semibold">{total} doc{total !== 1 ? "s" : ""}</span>}
            <ChevronSvg open={!!isOpen} />
          </div>
        </button>
        {isOpen && (
          <div>
            {children.length > 0 ? (
              children.map(child => renderTemplate(child, indent + 1))
            ) : (
              <div className="px-3 pb-3">
                {item.tipo === "anual" && (
                  <div className="ml-7 space-y-1">
                    {YEARS.map(y => {
                      const checked = isChecked(item.id, null, y);
                      const key = `${item.id}-${y}-`;
                      return (
                        <label key={y} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 px-2 -mx-2">
                          <button type="button" onClick={() => toggle(item.id, null, y)}
                            disabled={saving === key}
                            className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? CHECK_ON : CHECK_OFF}`}>
                            {checked && <CheckSvg size="w-3 h-3" />}
                          </button>
                          <span className={`text-xs ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{y}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {item.tipo === "trimestral" && (
                  <div className="ml-7 space-y-2">
                    {YEARS.map(y => (
                      <div key={y}>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{y}</p>
                        <div className="grid grid-cols-4 gap-1">
                          {QUARTERS.map((q, qi) => {
                            const checked = isChecked(item.id, null, y, q);
                            const key = `${item.id}-${y}-${q}`;
                            return (
                              <button key={q} type="button" onClick={() => toggle(item.id, null, y, q)}
                                disabled={saving === key}
                                className={`py-1.5 text-[11px] font-semibold border transition-all ${checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 text-gray-600 hover:border-[#2E1A47] hover:text-[#2E1A47]"}`}>
                                {Q_LABELS[qi]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderCustomItem(item: CustomItem) {
    if (item.tipo === "simple") {
      return <div key={item.id}>{renderSimpleCheck(null, item.id, item.nombre, 0, () => deleteCustomItem(item.id))}</div>;
    }

    const isOpen = openItems[item.id];
    const total = countChecked(null, item.id);
    const anyCheck = entries.some(e => e.custom_item_id === item.id && e.checked);

    return (
      <div key={item.id} className="border-b border-gray-50 last:border-0">
        <div className="flex items-center">
          <button onClick={() => toggleOpen(item.id)}
            className="flex-1 flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 transition-colors text-left">
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${anyCheck ? CHECK_ON : "border-gray-300"}`}>
                {anyCheck && total > 0 && <span className="text-[8px] font-bold text-white">{total}</span>}
              </div>
              <span className="text-sm text-gray-800 font-medium">{item.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              {total > 0 && <span className="text-[10px] text-emerald-600 font-semibold">{total} doc{total !== 1 ? "s" : ""}</span>}
              <ChevronSvg open={!!isOpen} />
            </div>
          </button>
          <button onClick={() => deleteCustomItem(item.id)}
            className="text-gray-300 hover:text-red-500 text-xs px-2 opacity-0 hover:opacity-100">✕</button>
        </div>
        {isOpen && (
          <div className="px-3 pb-3">
            {item.tipo === "anual" && (
              <div className="ml-7 space-y-1">
                {YEARS.map(y => {
                  const checked = isChecked(null, item.id, y);
                  const key = `${item.id}-${y}-`;
                  return (
                    <label key={y} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-gray-50 px-2 -mx-2">
                      <button type="button" onClick={() => toggle(null, item.id, y)}
                        disabled={saving === key}
                        className={`w-4 h-4 border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? CHECK_ON : CHECK_OFF}`}>
                        {checked && <CheckSvg size="w-3 h-3" />}
                      </button>
                      <span className={`text-xs ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{y}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {item.tipo === "trimestral" && (
              <div className="ml-7 space-y-2">
                {YEARS.map(y => (
                  <div key={y}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{y}</p>
                    <div className="grid grid-cols-4 gap-1">
                      {QUARTERS.map((q, qi) => {
                        const checked = isChecked(null, item.id, y, q);
                        const key = `${item.id}-${y}-${q}`;
                        return (
                          <button key={q} type="button" onClick={() => toggle(null, item.id, y, q)}
                            disabled={saving === key}
                            className={`py-1.5 text-[11px] font-semibold border transition-all ${checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 text-gray-600 hover:border-[#2E1A47] hover:text-[#2E1A47]"}`}>
                            {Q_LABELS[qi]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200">
      <div className={`bg-[#EEEBF3] px-5 py-3 flex items-center justify-between ${panelOpen ? "border-b border-gray-200" : ""}`}>
        <button type="button" onClick={() => setPanelOpen(o => !o)}
          className="flex-1 flex items-center justify-between text-left mr-3">
          <h3 className="text-xs font-bold text-[#2E1A47] uppercase tracking-wider">Documentación</h3>
          <ChevronSvg open={panelOpen} />
        </button>
        <button onClick={() => { setPanelOpen(true); setAddingItem(true); }}
          className="text-[10px] font-semibold text-[#2E1A47] hover:text-[#3d2460] uppercase tracking-wider">+ Añadir</button>
      </div>

      {panelOpen && (
      <div className="divide-y divide-gray-100">
        {rootTemplates.map(t => renderTemplate(t))}
        {customItems.map(c => renderCustomItem(c))}
      </div>
      )}

      {panelOpen && addingItem && (
        <div className="border-t border-gray-200 px-4 py-3 space-y-2 bg-gray-50/50">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Nombre del documento..."
            className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#2E1A47]"
            autoFocus
            onKeyDown={e => e.key === "Enter" && addCustomItem()} />
          <div className="flex gap-1">
            {(["simple", "anual", "trimestral"] as const).map(t => (
              <button key={t} type="button" onClick={() => setNewTipo(t)}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border transition-all ${newTipo === t ? "bg-[#2E1A47] text-white border-[#2E1A47]" : "border-gray-200 text-gray-500 hover:border-[#2E1A47]"}`}>
                {t === "simple" ? "Simple" : t === "anual" ? "Con años" : "Trimestral"}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setAddingItem(false); setNewName(""); }} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={addCustomItem} disabled={!newName.trim()}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2E1A47] hover:bg-[#3d2460] disabled:opacity-40 uppercase tracking-wider">Añadir</button>
          </div>
        </div>
      )}
    </div>
  );
}
