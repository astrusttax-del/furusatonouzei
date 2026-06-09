interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
  step?: number;
  min?: number;
  disabled?: boolean;
}

export default function NumberField({
  label,
  value,
  onChange,
  unit = '円',
  hint,
  step = 10000,
  min = 0,
  disabled,
}: Props) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input-wrap">
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            onChange(Number.isNaN(v) ? 0 : Math.max(min, v));
          }}
        />
        <span className="unit">{unit}</span>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
