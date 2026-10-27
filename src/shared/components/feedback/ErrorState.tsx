import { Button } from "@/shared/components/ui/Button";

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl bg-error-container p-5 text-on-error-container shadow-layer-1">
      <p className="text-title-md">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-3 h-11" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}
