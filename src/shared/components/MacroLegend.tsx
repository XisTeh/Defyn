import './macro-legend.css';

interface MacroLegendProps {
  proteinGrams: number | undefined;
  carbsGrams: number | undefined;
  fatGrams: number | undefined;
  stacked?: boolean;
  className?: string;
}

const formatGrams = (value: number | undefined) => value === undefined ? '—' : `${Math.round(value * 10) / 10} g`;

export function MacroLegend({ proteinGrams, carbsGrams, fatGrams, stacked = false, className = '' }: MacroLegendProps) {
  return <span className={`macro-legend ${stacked ? 'macro-legend--stacked' : ''} ${className}`.trim()} role="list" aria-label="Macronutrientes">
    <span className="macro-legend__protein" role="listitem" aria-label={`Proteína: ${formatGrams(proteinGrams)}`}><i aria-hidden="true" />P {formatGrams(proteinGrams)}</span>
    <span className="macro-legend__carbs" role="listitem" aria-label={`Carboidratos: ${formatGrams(carbsGrams)}`}><i aria-hidden="true" />C {formatGrams(carbsGrams)}</span>
    <span className="macro-legend__fat" role="listitem" aria-label={`Gorduras: ${formatGrams(fatGrams)}`}><i aria-hidden="true" />G {formatGrams(fatGrams)}</span>
  </span>;
}
