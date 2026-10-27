import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/shared/lib/cn";

export function QrCode({
  value,
  size = 200,
  className,
  label,
}: {
  value: string | null | undefined;
  size?: number;
  className?: string;
  label?: string;
}) {
  if (!value) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-label-md text-on-surface-variant">Sin código QR</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-layer-1",
        className,
      )}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="#ffffff"
        fgColor="#14532D"
        marginSize={1}
        aria-label={label ?? "Código QR"}
        role="img"
      />
      {label ? <p className="text-label-md text-on-surface-variant">{label}</p> : null}
    </div>
  );
}
