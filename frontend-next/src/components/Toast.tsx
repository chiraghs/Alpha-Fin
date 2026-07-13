"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Alert, Check } from "./Icons";

interface ToastItem {
  id: number;
  message: string;
  isError: boolean;
}

const ToastContext = createContext<(message: string, isError?: boolean) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, isError = false) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, isError }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rise-in card flex items-center gap-2.5 px-4 py-3 text-sm font-medium ${
              t.isError ? "border-critical/40 text-critical" : "border-brand/40"
            }`}
          >
            {t.isError ? <Alert width={15} height={15} className="shrink-0 text-critical" /> : <Check width={15} height={15} className="shrink-0 text-brand" />}
            <span className="max-w-72">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
