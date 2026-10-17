import { useId } from 'react';

export function Field({ label, hint, error, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {children({ id, 'aria-describedby': hint ? `${id}-hint` : undefined, 'aria-invalid': error ? true : undefined })}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}

export function TextInput({ label, hint, error, value, onChange, type = 'text', ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a) => <input {...a} {...rest} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function TextArea({ label, hint, error, value, onChange, rows = 4, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a) => <textarea {...a} {...rest} rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function Select({ label, hint, error, value, onChange, options }) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a) => (
        <select {...a} value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
    </Field>
  );
}

export function Choice({ legend, hint, error, options, value, onChange, multiple = false }) {
  const selected = multiple ? value || [] : value;
  const toggle = (v) => {
    if (!multiple) return onChange(selected === v ? '' : v);
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  return (
    <fieldset className="field choice">
      <legend>{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      <div className="chips">
        {options.map(([v, l]) => {
          const on = multiple ? selected.includes(v) : selected === v;
          return (
            <label key={v} className={on ? 'chip on' : 'chip'}>
              <input type={multiple ? 'checkbox' : 'radio'} name={legend} checked={on}
                onChange={() => toggle(v)} />
              <span>{l}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </fieldset>
  );
}
