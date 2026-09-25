import { useEffect } from "react";
import { varDefaults } from "./files.ts";
import { useVars } from "./vars.tsx";

interface VarFieldProps {
  name: string;
  label: string;
  secret?: boolean;
  persist?: boolean;
}

export function VarField({ name, label, secret = false, persist = false }: VarFieldProps) {
  const { values, setValue, registerSecret, toggleReveal, revealed } = useVars();
  const defaultValue = varDefaults[name];
  if (defaultValue === undefined) throw new Error(`VarField: no "// @var ${name}" found in tutorial code`);

  useEffect(() => {
    if (secret) registerSecret(name);
  }, [secret, name, registerSecret]);

  const value = values[name] === defaultValue ? "" : values[name];

  return (
    <calcite-label>
      {label}
      <calcite-input
        data-var={name}
        value={value}
        placeholder={defaultValue}
        type={secret && !revealed[name] ? "password" : "text"}
        oncalciteInputInput={(event) => setValue(name, event.currentTarget.value || defaultValue, persist)}
      >
        {secret && (
          <calcite-button
            slot="action"
            appearance="transparent"
            kind="neutral"
            label={revealed[name] ? "Hide" : "Show"}
            iconStart={revealed[name] ? "view-hide" : "view-visible"}
            onClick={() => toggleReveal(name)}
          />
        )}
      </calcite-input>
    </calcite-label>
  );
}
