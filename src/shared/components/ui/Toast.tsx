import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type Tone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  title?: string;
  message: string;
  tone: Tone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: Tone, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<Tone, { wrap: string; icon: typeof Info }> = {
  success: { wrap: "border-emerald/30 bg-white text-on-surface", icon: CheckCircle2 },
  error: { wrap: "border-error/30 bg-white text-on-surface", icon: XCircle },
  info: { wrap: "border-primary/20 bg-white text-on-surface", icon: Info },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: Tone = "success", title?: string) => {
      counter.current += 1;
      const id = counter.current;
      setItems((current) => [...current, { id, message, tone, title }]);
      window.setTimeout(() => remove(id), tone === "error" ? 6000 : 4500);
    },
    [remove],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {items.map((item) => {
          const meta = toneStyles[item.tone];
          const Icon = meta.icon;
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border p-3.5 shadow-layer-2",
                meta.wrap,
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  item.tone === "success" && "text-secondary",
                  item.tone === "error" && "text-error",
                  item.tone === "info" && "text-primary-container",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                {item.title ? (
                  <p className="text-label-lg text-on-surface">{item.title}</p>
                ) : null}
                <p className="text-body-md text-on-surface-variant">{item.message}</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => remove(item.id)}
                className="rounded-md p-1 text-outline hover:bg-surface-container"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
