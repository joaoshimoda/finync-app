"use client";

import {
  ChangeEvent,
  FormEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Monitor, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DependentManager } from "@/components/settings/DependentManager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

const AVATAR_CROP_SIZE = 280;
const AVATAR_OUTPUT_SIZE = 512;

function getInitials(name: string, email: string) {
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

export default function ConfiguracoesPage() {
  const authUser = useFinanceStore((state) => state.authUser);
  const updateAuthUser = useFinanceStore((state) => state.updateAuthUser);
  const metadataName = authUser?.user_metadata?.name;
  const currentName =
    typeof metadataName === "string" ? metadataName.trim() : "";
  const email = authUser?.email || "";
  const metadataAvatarUrl = authUser?.user_metadata?.avatar_url;
  const avatarUrl =
    typeof metadataAvatarUrl === "string" ? metadataAvatarUrl : undefined;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("BRL");
  const [dateFormat, setDateFormat] = useState("DD/MM/AAAA");
  const [hideBalances, setHideBalances] = useState(false);
  const [invoiceReminder, setInvoiceReminder] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
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
  const resolvedDisplayName = displayName ?? currentName;
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
        console.warn("Não foi possível atualizar avatar_url em users:", profileError);
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

      closeCropDialog();
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error("Erro ao enviar avatar:", error);
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
      console.error("Erro ao recortar avatar:", error);
      toast.error("Não foi possível recortar a foto.");
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = resolvedDisplayName.trim();

    if (!normalizedName) {
      toast.error("Informe um nome de exibição.");
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { ...authUser?.user_metadata, name: normalizedName },
      });

      if (error) throw error;

      if (data.user) {
        updateAuthUser(data.user);
      }

      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      toast.error("Usuário não autenticado.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) throw signInError;

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      toast.error("Não foi possível atualizar a senha.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Sua conta, do seu jeito.
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Atualize suas informações pessoais e ajuste a experiência do Finync.
        </p>
      </header>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-2 border border-zinc-800 bg-zinc-900/60 p-1 backdrop-blur sm:w-[680px] sm:grid-cols-4">
          <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <div className="mt-6 grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="h-fit lg:col-span-4">
              <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none">
                <CardContent className="flex flex-col items-center px-6 py-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                  />
                  <button
                    type="button"
                    className="rounded-full transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    aria-label="Alterar foto"
                  >
                    <Avatar className="h-24 w-24 border border-zinc-800">
                      <AvatarImage
                        src={avatarUrl}
                        alt={resolvedDisplayName || email}
                      />
                      <AvatarFallback className="bg-zinc-900 text-2xl font-semibold text-zinc-100">
                        {getInitials(resolvedDisplayName, email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <h2 className="mt-5 max-w-full truncate text-base font-semibold text-zinc-100">
                    {resolvedDisplayName || "Seu perfil"}
                  </h2>
                  <p className="mt-1 max-w-full truncate text-sm text-zinc-500">
                    {email}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-6 w-full border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-900"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingAvatar ? "Enviando..." : "Alterar foto"}
                  </Button>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    JPG ou PNG quadrado, com boa iluminação.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6 lg:col-span-8">
              <form onSubmit={handleSaveProfile}>
                <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none">
                  <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
                    <CardTitle>Dados do perfil</CardTitle>
                    <CardDescription>
                      Defina como suas informações aparecem no sistema.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-6 py-7">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="display-name">Nome de Exibição</Label>
                        <Input
                          id="display-name"
                          value={resolvedDisplayName}
                          onChange={(event) =>
                            setDisplayName(event.target.value)
                          }
                          placeholder="Como você quer ser chamado"
                          autoComplete="name"
                          className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-email">E-mail</Label>
                        <Input
                          id="profile-email"
                          value={email}
                          type="email"
                          disabled
                          readOnly
                          className="h-11 border-zinc-800 bg-zinc-900 text-zinc-500"
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end border-t border-zinc-800/80 px-6 py-5">
                    <Button
                      type="submit"
                      variant="default"
                      size="default"
                      disabled={isSaving}
                    >
                      {isSaving ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>

              <Card className="border-red-900/50 bg-zinc-900/50 shadow-none">
                <CardHeader className="border-b border-red-900/30 px-6 py-5">
                  <CardTitle>Danger Zone</CardTitle>
                  <CardDescription>
                    Ações críticas da conta ficam concentradas aqui.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      Excluir minha conta
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Remove seu acesso e inicia a limpeza dos dados vinculados.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2"
                  >
                    <Trash2 className="size-4" />
                    Excluir minha conta
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dependentes" className="mt-6 w-full">
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <DependentManager />
            </div>

            <Card className="h-fit border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-4">
              <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
                <CardTitle>Uso no sistema</CardTitle>
                <CardDescription>
                  Dependentes alimentam o split de gastos e a leitura de faturas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 px-6 py-6 text-sm leading-6 text-zinc-400">
                <p>
                  Cadastre pessoas que podem aparecer em compras importadas,
                  divisões de despesas e relatórios de valores a receber.
                </p>
                <p>
                  Ao vincular uma transação a um dependente, ela continua na
                  fatura do cartão, mas não reduz o seu saldo disponível pessoal.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent
          value="preferencias"
          className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-12"
        >
          <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-5">
            <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
              <CardTitle>Preferências regionais</CardTitle>
              <CardDescription>
                Ajuste como valores e datas aparecem no Finync.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-7">
              <div className="space-y-2">
                <Label>Moeda Padrão</Label>
                <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                  <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Selecione a moeda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL · Real brasileiro</SelectItem>
                    <SelectItem value="USD">USD · Dólar americano</SelectItem>
                    <SelectItem value="EUR">EUR · Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato de Data</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100">
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/AAAA">DD/MM/AAAA</SelectItem>
                    <SelectItem value="MM/DD/AAAA">MM/DD/AAAA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-3">
            <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
              <CardTitle>Privacidade</CardTitle>
              <CardDescription>
                Controle a exposição dos saldos.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <Label htmlFor="hide-balances" className="text-sm text-zinc-100">
                    Ocultar saldos por padrão
                  </Label>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Esconde valores financeiros na primeira visualização.
                  </p>
                </div>
                <Switch
                  id="hide-balances"
                  checked={hideBalances}
                  onCheckedChange={setHideBalances}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-4">
            <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
              <CardTitle>Notificações</CardTitle>
              <CardDescription>
                Ajuste os lembretes financeiros do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <Label htmlFor="invoice-reminder" className="text-sm text-zinc-100">
                    Lembrete de faturas
                  </Label>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Receba alertas antes do vencimento.
                  </p>
                </div>
                <Switch
                  id="invoice-reminder"
                  checked={invoiceReminder}
                  onCheckedChange={setInvoiceReminder}
                />
              </div>

              <div className="flex items-center justify-between gap-5 border-t border-zinc-800/80 pt-5">
                <div>
                  <Label htmlFor="weekly-summary" className="text-sm text-zinc-100">
                    Resumo semanal
                  </Label>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Um panorama curto da semana financeira.
                  </p>
                </div>
                <Switch
                  id="weekly-summary"
                  checked={weeklySummary}
                  onCheckedChange={setWeeklySummary}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="seguranca"
          className="mt-6 grid w-full grid-cols-1 gap-6 lg:grid-cols-12"
        >
          <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-7">
            <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha mantendo a sessão protegida.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="grid grid-cols-1 gap-6 px-6 py-7 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                    autoComplete="current-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 border-zinc-700 bg-zinc-900 text-zinc-100"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="justify-end border-t border-zinc-800/80 px-6 py-5">
                <Button
                  type="submit"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="h-fit border-zinc-800/80 bg-zinc-900/50 shadow-none lg:col-span-5">
            <CardHeader className="border-b border-zinc-800/80 px-6 py-6">
              <CardTitle>Sessões Ativas</CardTitle>
              <CardDescription>
                Dispositivos conectados à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <div className="flex items-center gap-4 rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-300">
                  <Monitor className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    Windows PC
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Sessão atual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <Button
              type="button"
              variant="ghost"
              onClick={closeCropDialog}
              disabled={isUploadingAvatar}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => void handleSaveCroppedAvatar()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Salvando..." : "Salvar Foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
