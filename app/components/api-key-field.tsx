import { useEffect, useState } from "react";

const STORAGE_KEY = "pl_user_api_key";

export function ApiKeyField() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setValue(stored);
  }, []);

  useEffect(() => {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  }, [value]);

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="underline-offset-2 hover:underline"
      >
        {value ? "Using your API key" : "Use your own API key"}
      </button>
      {open && (
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-..."
          className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
        />
      )}
      {!open && value && <input type="hidden" name="apiKey" value={value} />}
    </div>
  );
}
