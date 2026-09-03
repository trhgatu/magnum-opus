"use client";

import type { MoodLabel, MoodResponse } from "@repo/contracts";
import { RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { removeMood, setMood } from "@/features/mood/actions/mood";
import { notifySuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MOOD_OPTIONS: ReadonlyArray<{
  value: MoodLabel;
  label: string;
  symbol: string;
}> = [
  { value: "JOYFUL", label: "Vui", symbol: "✦" },
  { value: "CALM", label: "Bình yên", symbol: "◌" },
  { value: "HOPEFUL", label: "Hy vọng", symbol: "↗" },
  { value: "ENERGETIC", label: "Tràn năng lượng", symbol: "ϟ" },
  { value: "NEUTRAL", label: "Trung tính", symbol: "—" },
  { value: "TIRED", label: "Mệt", symbol: "◒" },
  { value: "ANXIOUS", label: "Lo âu", symbol: "≈" },
  { value: "SAD", label: "Buồn", symbol: "◇" },
  { value: "ANGRY", label: "Tức giận", symbol: "△" },
  { value: "OVERWHELMED", label: "Quá tải", symbol: "※" },
];

const moodOption = (label: MoodLabel) =>
  MOOD_OPTIONS.find((option) => option.value === label) ?? MOOD_OPTIONS[4];

interface MoodPanelProps {
  journalEntryId: string;
  initialMood: MoodResponse | null;
  editable: boolean;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function MoodPanel({
  journalEntryId,
  initialMood,
  editable,
  disabled = false,
  onBusyChange,
}: MoodPanelProps) {
  const router = useRouter();
  const [mood, setCurrentMood] = useState(initialMood);
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState<MoodLabel>(
    initialMood?.label ?? "NEUTRAL",
  );
  const [intensity, setIntensity] = useState<number | null>(
    initialMood?.intensity ?? null,
  );
  const [note, setNote] = useState(initialMood?.note ?? "");
  const [message, setMessage] = useState<string>();
  const [isConflict, setIsConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    onBusyChange?.(isPending);
    return () => onBusyChange?.(false);
  }, [isPending, onBusyChange]);

  const beginEditing = () => {
    setLabel(mood?.label ?? "NEUTRAL");
    setIntensity(mood?.intensity ?? null);
    setNote(mood?.note ?? "");
    setMessage(undefined);
    setIsConflict(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setMessage(undefined);
    setIsConflict(false);
  };

  const save = () => {
    setMessage(undefined);
    setIsConflict(false);
    startTransition(async () => {
      const result = await setMood({
        journalEntryId,
        label,
        intensity,
        note,
        ...(mood ? { expectedRevision: mood.revision } : {}),
      });

      if (result.status === "error") {
        setMessage(result.message);
        setIsConflict(result.code === "MOOD_REVISION_CONFLICT");
        return;
      }

      setCurrentMood(result.mood);
      setLabel(result.mood.label);
      setIntensity(result.mood.intensity);
      setNote(result.mood.note ?? "");
      setIsEditing(false);
      void notifySuccess("Đã lưu tâm trạng.");
    });
  };

  const remove = () => {
    if (!mood) return;

    setMessage(undefined);
    setIsConflict(false);
    startTransition(async () => {
      const result = await removeMood({
        journalEntryId,
        expectedRevision: mood.revision,
      });

      if (result.status === "error") {
        setMessage(result.message);
        setIsConflict(result.code === "MOOD_REVISION_CONFLICT");
        return;
      }

      setCurrentMood(null);
      setLabel("NEUTRAL");
      setIntensity(null);
      setNote("");
      setIsEditing(false);
      void notifySuccess("Đã loại bỏ tâm trạng khỏi trang.");
    });
  };

  const selectedOption = mood ? moodOption(mood.label) : null;

  return (
    <Card className="border-primary/15 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Tâm trạng
        </CardTitle>
        <CardDescription>
          Ghi lại trạng thái bên trong của khoảnh khắc này.
        </CardDescription>
        {editable && !isEditing ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={beginEditing}
              disabled={disabled || isPending}
            >
              {mood ? "Thay đổi" : "Thêm tâm trạng"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Trạng thái gần nhất
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={label === option.value}
                    onClick={() => setLabel(option.value)}
                    disabled={disabled || isPending}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
                      label === option.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="text-lg text-primary" aria-hidden="true">
                      {option.symbol}
                    </span>
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Cường độ{" "}
                <span className="text-muted-foreground">(tùy chọn)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={intensity === null ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={intensity === null}
                  onClick={() => setIntensity(null)}
                  disabled={disabled || isPending}
                >
                  Không chọn
                </Button>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={intensity === value ? "secondary" : "outline"}
                    size="sm"
                    aria-label={`Cường độ ${value}`}
                    aria-pressed={intensity === value}
                    onClick={() => setIntensity(value)}
                    disabled={disabled || isPending}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                1 là nhẹ, 5 là rất mạnh.
              </p>
            </fieldset>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="mood-note">Ghi chú ngắn</Label>
                <span className="text-xs text-muted-foreground">
                  {[...note].length}/500
                </span>
              </div>
              <Textarea
                id="mood-note"
                value={note}
                maxLength={500}
                rows={3}
                placeholder="Điều gì khiến trạng thái này xuất hiện?"
                onChange={(event) => setNote(event.target.value)}
                disabled={disabled || isPending}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={save}
                disabled={disabled || isPending}
              >
                {isPending ? "Đang lưu…" : "Lưu tâm trạng"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelEditing}
                disabled={isPending}
              >
                Hủy
              </Button>
              {mood ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      className="sm:ml-auto"
                      disabled={disabled || isPending}
                    >
                      <Trash2 aria-hidden="true" />
                      Loại bỏ tâm trạng
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Loại bỏ tâm trạng?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Chỉ tâm trạng bị loại bỏ. Nội dung Nhật ký vẫn được giữ
                        nguyên.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Giữ lại</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={remove}>
                        Loại bỏ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        ) : mood && selectedOption ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5" variant="secondary">
                <span aria-hidden="true">{selectedOption.symbol}</span>
                {selectedOption.label}
              </Badge>
              {mood.intensity ? (
                <span className="text-sm text-muted-foreground">
                  Cường độ {mood.intensity}/5
                </span>
              ) : null}
            </div>
            {mood.note ? (
              <p className="whitespace-pre-wrap text-sm leading-6">
                {mood.note}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Không có ghi chú đi kèm.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Trang này chưa lưu lại trạng thái cảm xúc.
          </p>
        )}

        {message ? (
          <Alert
            variant={isConflict ? "destructive" : "default"}
            role={isConflict ? "alert" : "status"}
          >
            {isConflict ? (
              <AlertTitle>Tâm trạng đã thay đổi ở nơi khác</AlertTitle>
            ) : null}
            <AlertDescription>{message}</AlertDescription>
            {isConflict ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.refresh()}
              >
                <RefreshCw aria-hidden="true" />
                Tải bản mới nhất
              </Button>
            ) : null}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
