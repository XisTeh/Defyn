import { useEffect, useRef } from 'react';
import { NUTRITION_LABEL_ROWS } from '../../domain/food/nutrition-label-parser';
import { recalculateNutritionLabel, validateNutritionLabelStructure, type CoreNutrientKey, type NutritionLabel, type NutritionLabelColumn } from '../../domain/food/nutrition-label';

function display(value: number | undefined) { return value === undefined ? '' : String(value).replace('.', ','); }
function parsed(value: string) { if (!value.trim()) return undefined; const result = Number(value.replace(',', '.')); return Number.isFinite(result) && result >= 0 ? result : undefined; }

function statusFor(label: NutritionLabel, key: CoreNutrientKey) {
  const values = label.columns.flatMap((column) => column.kind === 'daily-value' ? [column.dailyValuesPercent?.[key]] : [column.values?.[key]]);
  if (values.every((value) => value === undefined)) return 'ausente';
  if (label.columns.some((column) => column.cellStatus?.[key] === 'review')) return 'revisar';
  if (label.columns.some((column) => column.cellStatus?.[key] === 'confirmed')) return 'confirmado';
  return 'provável';
}

function cellValue(column: NutritionLabelColumn, key: CoreNutrientKey) {
  return column.kind === 'daily-value' ? column.dailyValuesPercent?.[key] : column.values?.[key];
}

export function NutritionLabelTable({ label, editable = false, onChange }: { label: NutritionLabel; editable?: boolean; onChange?: (label: NutritionLabel) => void }) {
  const latestLabel = useRef(label);
  useEffect(() => { latestLabel.current = label; }, [label]);
  const issues = validateNutritionLabelStructure(label);
  function publish(next: NutritionLabel) { latestLabel.current = next; onChange?.(next); }
  function updateCell(columnId: string, key: CoreNutrientKey, raw: string) {
    const value = parsed(raw);
    const next: NutritionLabel = structuredClone(latestLabel.current);
    const column = next.columns.find((item) => item.id === columnId); if (!column || column.source === 'derived') return;
    if (column.kind === 'daily-value') column.dailyValuesPercent = { ...column.dailyValuesPercent, [key]: value };
    else column.values = { ...column.values, [key]: value };
    column.cellStatus = { ...column.cellStatus, [key]: value === undefined ? 'missing' : 'confirmed' };
    publish(recalculateNutritionLabel(next));
  }
  function updateServing(quantity: number, unit: 'g' | 'ml') {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    const next: NutritionLabel = structuredClone(latestLabel.current); next.declaredServing = { quantity, unit };
    const column = next.columns.find((item) => item.id === 'declared-serving');
    if (column) { column.label = `${quantity} ${unit}`; column.basis = { quantity, unit }; }
    publish(recalculateNutritionLabel(next));
  }
  function updateServingsPerContainer(raw: string) { publish({ ...latestLabel.current, servingsPerContainer: parsed(raw) }); }
  return <section className="nutrition-label-review" aria-label="Tabela nutricional estruturada">
    <header><div><span className="page-eyebrow">Tabela preservada</span><h3>Confirmar tabela</h3></div><span className={`basis-source ${label.calculationBasis.source}`}>Base {label.calculationBasis.source === 'explicit' ? 'impressa' : 'derivada'} · {label.calculationBasis.quantity} {label.calculationBasis.unit}</span></header>
    <div className="label-serving-meta">
      <label>Porções por embalagem<input type="number" min="0" step="0.1" value={label.servingsPerContainer ?? ''} readOnly={!editable} onChange={(event) => updateServingsPerContainer(event.target.value)} placeholder="—" /></label>
      <label>Tamanho da porção<input type="number" min="0.1" step="0.1" value={label.declaredServing?.quantity ?? ''} readOnly={!editable} onChange={(event) => updateServing(Number(event.target.value), label.declaredServing?.unit ?? 'g')} placeholder="—" /></label>
      <label>Unidade<select value={label.declaredServing?.unit ?? 'g'} disabled={!editable} onChange={(event) => updateServing(label.declaredServing?.quantity ?? 100, event.target.value as 'g'|'ml')}><option value="g">g</option><option value="ml">ml</option></select></label>
    </div>
    <div className="nutrition-label-table-scroll"><table><thead><tr><th>Nutriente</th>{label.columns.map((column) => <th key={column.id}>{column.label}{column.source === 'derived' && <small>derivada</small>}</th>)}<th>Status</th></tr></thead><tbody>{NUTRITION_LABEL_ROWS.map((row) => <tr key={row.key}><th>{row.label}<small>{row.unit}</small></th>{label.columns.map((column) => <td key={column.id}>{editable && column.source === 'explicit' ? <input aria-label={`${row.label} · ${column.label}`} inputMode="decimal" value={display(cellValue(column, row.key))} onChange={(event) => updateCell(column.id, row.key, event.target.value)} placeholder="—" /> : <span>{display(cellValue(column, row.key)) || '—'}{column.kind === 'daily-value' && cellValue(column,row.key) !== undefined ? '%' : ''}</span>}</td>)}<td><span className={`cell-status ${statusFor(label,row.key)}`}>{statusFor(label,row.key)}</span></td></tr>)}</tbody></table></div>
    {issues.length > 0 && <aside className="label-validation" role="status">{issues.map((issue) => <p key={`${issue.kind}-${issue.nutrientKeys.join('-')}`}>{issue.message}</p>)}</aside>}
  </section>;
}
