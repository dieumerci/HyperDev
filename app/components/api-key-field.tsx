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
    <div className="flex items-center justify-end gap-2">
      {open ? (
        <>
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-ant-..."
            aria-label="Your Anthropic API key"
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            Done
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={value ? "Using your API key" : "Use your own API key"}
          className="text-xs text-neutral-400 hover:text-neutral-700"
        >
          {value ? "key: yours" : "key: server"}
        </button>
      )}
      {!open && value && <input type="hidden" name="apiKey" value={value} />}
    </div>
  );
}
