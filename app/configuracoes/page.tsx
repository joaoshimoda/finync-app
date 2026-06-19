"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TagManager } from "@/components/settings/TagManager";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";
import { useFinanceStore } from "@/store/useFinanceStore";

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

export default function ConfiguracoesPage() {
  const authUser = useFinanceStore((state) => state.authUser);
  const metadataName = authUser?.user_metadata?.name;
  const currentName =
    typeof metadataName === "string" ? metadataName.trim() : "";
  const email = authUser?.email || "";
  const metadataAvatarUrl = authUser?.user_metadata?.avatar_url;
  const avatarUrl =
    typeof metadataAvatarUrl === "string" ? metadataAvatarUrl : undefined;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const resolvedDisplayName = displayName ?? currentName;

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = resolvedDisplayName.trim();

    if (!normalizedName) {
      toast.error("Informe um nome de exibição.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: normalizedName },
      });

      if (error) throw error;

      toast.success("Perfil atualizado!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Não foi possível salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <header className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold text-zinc-400">Configurações</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">
          Sua conta, do seu jeito.
        </h1>
        <p className="text-sm leading-6 text-zinc-400">
          Atualize suas informações pessoais e ajuste a experiência do Finync.
        </p>
      </header>

      <Tabs defaultValue="perfil" className="w-full max-w-5xl">
        <TabsList className="grid w-full grid-cols-3 border border-zinc-800 bg-zinc-950 p-1 sm:w-[440px]">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <form
            onSubmit={handleSaveProfile}
            className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start"
          >
            <Card className="border-zinc-800 bg-zinc-950 shadow-none">
              <CardContent className="flex flex-col items-center px-6 py-8 text-center">
                <Avatar className="h-24 w-24 border border-zinc-800">
                  <AvatarImage
                    src={avatarUrl}
                    alt={resolvedDisplayName || email}
                  />
                  <AvatarFallback className="bg-zinc-900 text-2xl font-semibold text-zinc-100">
                    {getInitials(resolvedDisplayName, email)}
                  </AvatarFallback>
                </Avatar>
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
                  disabled
                >
                  Alterar foto
                </Button>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  JPG ou PNG quadrado, com boa iluminação.
                </p>
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-950 shadow-none">
              <CardHeader className="border-b border-zinc-800 px-6 py-6">
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
                      onChange={(event) => setDisplayName(event.target.value)}
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

              <CardFooter className="justify-end border-t border-zinc-800 px-6 py-5">
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
        </TabsContent>

        <TabsContent value="preferencias" className="mt-6">
          <TagManager />
        </TabsContent>

        <TabsContent value="dependentes" className="mt-6">
          <DependentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
