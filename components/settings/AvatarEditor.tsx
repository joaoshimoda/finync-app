"use client";

import {
  ChangeEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PrimaryButton, SecondaryButton } from "@/components/modals/ModalKit";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportAppError } from "@/lib/errorMonitoring";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

const AVATAR_CROP_SIZE = 280;
const AVATAR_OUTPUT_SIZE = 512;
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;

export function getInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "US";

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "US"
  );
}

function getCoverImageLayout(
  imageSize: { width: number; height: number },
  cropPosition: { x: number; y: number },
  zoom: number,
) {
  if (!imageSize.width || !imageSize.height) {
    return {
      left: 0,
      top: 0,
      width: AVATAR_CROP_SIZE,
      height: AVATAR_CROP_SIZE,
    };
  }

  const baseScale = Math.max(
    AVATAR_CROP_SIZE / imageSize.width,
    AVATAR_CROP_SIZE / imageSize.height,
  );
  const scaledWidth = imageSize.width * baseScale * zoom;
  const scaledHeight = imageSize.height * baseScale * zoom;

  return {
    left: (AVATAR_CROP_SIZE - scaledWidth) / 2 + cropPosition.x,
    top: (AVATAR_CROP_SIZE - scaledHeight) / 2 + cropPosition.y,
    width: scaledWidth,
    height: scaledHeight,
  };
}

async function loadImage(src: string) {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.src = src;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
  });

  return image;
}

function getAvatarStoragePath(publicUrl: string | undefined) {
  if (!publicUrl) return null;

  const marker = "/storage/v1/object/public/avatars/";
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex < 0) return null;

  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}

/* Avatar with a camera button; picking a file opens a drag-and-zoom crop
   dialog and the square result is uploaded to the `avatars` bucket. */
export function AvatarEditor({ displayName }: { displayName: string }) {
  const authUser = useFinanceStore((state) => state.authUser);
  const updateAuthUser = useFinanceStore((state) => state.updateAuthUser);
  const email = authUser?.email || "";
  const metadataAvatarUrl = authUser?.user_metadata?.avatar_url;
  const avatarUrl =
    typeof metadataAvatarUrl === "string" ? metadataAvatarUrl : undefined;
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    cropX: number;
    cropY: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropLayout = useMemo(
    () => getCoverImageLayout(cropImageSize, cropPosition, cropZoom),
    [cropImageSize, cropPosition, cropZoom],
  );

  useEffect(() => {
    return () => {
      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl]);

  function closeCropDialog() {
    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }

    setCropImageUrl(null);
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropImageSize({ width: 0, height: 0 });
    setDragStart(null);
  }

  function handleAvatarFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      event.target.value = "";
      return;
    }

    if (cropImageUrl) {
      URL.revokeObjectURL(cropImageUrl);
    }

    setCropImageUrl(URL.createObjectURL(file));
    setCropPosition({ x: 0, y: 0 });
    setCropZoom(1);
    setCropImageSize({ width: 0, height: 0 });
    event.target.value = "";
  }

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cropX: cropPosition.x,
      cropY: cropPosition.y,
    });
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || dragStart.pointerId !== event.pointerId) return;

    setCropPosition({
      x: dragStart.cropX + event.clientX - dragStart.x,
      y: dragStart.cropY + event.clientY - dragStart.y,
    });
  }

  function handleCropPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  }

  async function createCroppedAvatarFile() {
    if (!cropImageUrl) {
      throw new Error("Nenhuma imagem selecionada.");
    }

    const image = await loadImage(cropImageUrl);
    const layout = getCoverImageLayout(
      { width: image.naturalWidth, height: image.naturalHeight },
      cropPosition,
      cropZoom,
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Não foi possível preparar o recorte.");
    }

    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;

    const scale = AVATAR_OUTPUT_SIZE / AVATAR_CROP_SIZE;
    context.fillStyle = "#09090b";
    context.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
    context.drawImage(
      image,
      layout.left * scale,
      layout.top * scale,
      layout.width * scale,
      layout.height * scale,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    );

    if (!blob) {
      throw new Error("Não foi possível gerar a foto recortada.");
    }

    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  }

  async function uploadAvatarFile(file: File) {
    if (!authUser) {
      toast.error("Usuário não autenticado.");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const filePath = `${authUser.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: profileError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", authUser.id);

      if (profileError && profileError.code !== "PGRST204") {
        void reportAppError(profileError, {
          source: "SUPABASE",
          severity: "WARNING",
          context: { operation: "Atualizar referência do avatar" },
        });
      }

      const { data, error: userError } = await supabase.auth.updateUser({
        data: {
          ...authUser.user_metadata,
          avatar_url: publicUrl,
        },
      });

      if (userError) throw userError;

      if (data.user) {
        updateAuthUser(data.user);
      }

      const previousAvatarPath = getAvatarStoragePath(avatarUrl);

      if (previousAvatarPath && previousAvatarPath !== filePath) {
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove([previousAvatarPath]);

        if (removeError) {
          void reportAppError(removeError, {
            source: "SUPABASE",
            severity: "WARNING",
            context: { operation: "Remover avatar anterior" },
          });
        }
      }

      closeCropDialog();
      toast.success("Foto atualizada!");
    } catch (error) {
      void reportAppError(error, {
        source: "SUPABASE",
        context: { operation: "Enviar avatar" },
      });
      toast.error("Não foi possível atualizar a foto.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSaveCroppedAvatar() {
    try {
      const croppedAvatar = await createCroppedAvatarFile();
      await uploadAvatarFile(croppedAvatar);
    } catch (error) {
      void reportAppError(error, {
        source: "CLIENT",
        context: { operation: "Recortar avatar" },
      });
      toast.error("Não foi possível recortar a foto.");
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileSelect}
      />
      <button
        type="button"
        className="group relative shrink-0 self-start rounded-full outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadingAvatar}
        aria-label="Alterar foto"
      >
        <Avatar className="size-20 ring-1 ring-white/10 sm:size-24">
          <AvatarImage src={avatarUrl} alt={displayName || email} />
          <AvatarFallback className="bg-emerald-400/10 text-2xl font-semibold text-emerald-200">
            {getInitials(displayName, email)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -right-0.5 -bottom-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-lg ring-4 ring-zinc-950 transition-transform group-hover:scale-105 light:ring-zinc-50">
          {isUploadingAvatar ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
        </span>
      </button>

      <Dialog open={Boolean(cropImageUrl)} onOpenChange={(open) => !open && closeCropDialog()}>
        <DialogContent className="border border-zinc-800 bg-zinc-950 text-white shadow-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
            <DialogDescription>
              Arraste para posicionar e use o zoom para enquadrar seu avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-2">
            <div
              className="relative touch-none overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 shadow-inner"
              style={{ width: AVATAR_CROP_SIZE, height: AVATAR_CROP_SIZE }}
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={handleCropPointerUp}
              onPointerCancel={handleCropPointerUp}
            >
              {cropImageUrl ? (
                <Image
                  src={cropImageUrl}
                  alt="Prévia do avatar"
                  width={Math.max(1, Math.round(cropLayout.width))}
                  height={Math.max(1, Math.round(cropLayout.height))}
                  unoptimized
                  draggable={false}
                  onLoad={(event) =>
                    setCropImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }
                  className="absolute max-w-none cursor-grab select-none active:cursor-grabbing"
                  style={{
                    left: cropLayout.left,
                    top: cropLayout.top,
                    width: cropLayout.width,
                    height: cropLayout.height,
                  }}
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 ring-offset-8 ring-offset-zinc-950" />
            </div>

            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Zoom</span>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropZoom}
                onChange={(event) => setCropZoom(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <SecondaryButton onClick={closeCropDialog} disabled={isUploadingAvatar}>
              Cancelar
            </SecondaryButton>
            <PrimaryButton
              accent="emerald"
              type="button"
              onClick={() => void handleSaveCroppedAvatar()}
              loading={isUploadingAvatar}
              loadingLabel="Salvando..."
            >
              Salvar foto
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
