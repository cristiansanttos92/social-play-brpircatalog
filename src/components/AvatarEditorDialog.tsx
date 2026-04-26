import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, ZoomIn, Move } from "lucide-react";

interface AvatarEditorDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  title?: string;
  description?: string;
  frameWidth?: number;
  frameHeight?: number;
  roundFrame?: boolean;
  confirmLabel?: string;
}

const DEFAULT_FRAME_WIDTH = 280;
const DEFAULT_FRAME_HEIGHT = 280;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

export const AvatarEditorDialog = ({
  file,
  open,
  onOpenChange,
  onConfirm,
  title = "Ajustar imagem",
  description = "Arraste a imagem, aplique zoom e confirme o corte antes de salvar.",
  frameWidth = DEFAULT_FRAME_WIDTH,
  frameHeight = DEFAULT_FRAME_HEIGHT,
  roundFrame = true,
  confirmLabel = "Usar imagem",
}: AvatarEditorDialogProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 });

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setScale(1);
    setPosition({ x: 0, y: 0 });

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const resetEditor = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const clampPosition = (nextX: number, nextY: number) => {
    const image = imageRef.current;
    if (!image) return { x: nextX, y: nextY };

    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;
    const limitX = Math.max(0, (scaledWidth - frameWidth) / 2);
    const limitY = Math.max(0, (scaledHeight - frameHeight) / 2);

    return {
      x: Math.min(limitX, Math.max(-limitX, nextX)),
      y: Math.min(limitY, Math.max(-limitY, nextY)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    const next = clampPosition(dragStartRef.current.originX + deltaX, dragStartRef.current.originY + deltaY);
    setPosition(next);
  };

  const handlePointerEnd = () => {
    setIsDragging(false);
  };

  const handleImageLoad = () => {
    const image = imageRef.current;
    if (!image) return;

    const widthScale = frameWidth / image.naturalWidth;
    const heightScale = frameHeight / image.naturalHeight;
    const fittedScale = Math.max(widthScale, heightScale);
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, fittedScale)));
    setPosition({ x: 0, y: 0 });
  };

  const previewStyle = useMemo(
    () => ({
      transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
      transformOrigin: "center center",
    }),
    [position.x, position.y, scale]
  );

  const exportCroppedBlob = async () => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    const scaledWidth = image.naturalWidth * scale;
    const scaledHeight = image.naturalHeight * scale;
    const drawX = (frameWidth - scaledWidth) / 2 + position.x;
    const drawY = (frameHeight - scaledHeight) / 2 + position.y;

    context.clearRect(0, 0, frameWidth, frameHeight);
    context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    setIsSaving(true);
    try {
      await onConfirm(blob);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col items-center gap-4">
            <div
              className={`relative overflow-hidden border border-border bg-muted/40 shadow-inner ${roundFrame ? "rounded-full" : "rounded-2xl"}`}
              style={{ width: frameWidth, height: frameHeight }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
            >
              {imageSrc ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Preview do avatar"
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  draggable={false}
                  style={previewStyle}
                  onLoad={handleImageLoad}
                />
              ) : null}
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Move className="h-3.5 w-3.5" />
              Arraste para reposicionar a imagem dentro do corte.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ZoomIn className="h-4 w-4" />
                Zoom
              </div>
              <Slider min={MIN_SCALE} max={MAX_SCALE} step={0.01} value={[scale]} onValueChange={(value) => setScale(value[0])} />
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <p className="text-sm font-medium">Visualizacao</p>
              <p className="text-sm text-muted-foreground">
                O resultado final sera exportado com o enquadramento exibido nesta tela.
              </p>
              <Button type="button" variant="outline" onClick={resetEditor}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Resetar ajuste
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={exportCroppedBlob} disabled={!imageSrc || isSaving}>
            {isSaving ? "Aplicando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
