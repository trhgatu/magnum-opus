import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function LifecycleErrorAlert({
  message,
  hasConflict,
  onReload,
}: {
  message: string;
  hasConflict: boolean;
  onReload: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>

      {hasConflict ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-1 h-auto justify-start p-0 text-destructive"
          onClick={onReload}
        >
          Tải bản mới nhất
        </Button>
      ) : null}
    </Alert>
  );
}
