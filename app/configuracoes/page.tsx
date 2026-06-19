"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <div className="flex w-full flex-col gap-8">
      <header>
        <p className="text-sm font-medium text-brand-300">Configurações</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Ajustes da conta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gerencie seus dados pessoais e preferências do Finync.
        </p>
      </header>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil">
          <form onSubmit={handleSaveProfile}>
            <Card className="max-w-3xl border-border/60 bg-card/80">
              <CardHeader className="border-b border-border/60">
                <CardTitle>Dados do perfil</CardTitle>
                <CardDescription>
                  Atualize como suas informações aparecem dentro do Finync.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={avatarUrl}
                      alt={resolvedDisplayName || email}
                    />
                    <AvatarFallback className="text-xl">
                      {getInitials(resolvedDisplayName, email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" disabled>
                      Alterar foto
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Recomendado: JPG ou PNG quadrado
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Nome de Exibição</Label>
                    <Input
                      id="display-name"
                      value={resolvedDisplayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Como você quer ser chamado"
                      autoComplete="name"
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
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="justify-end">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="preferencias">
          <Card className="max-w-3xl border-border/60 bg-card/80">
            <CardHeader>
              <CardTitle>Preferências do aplicativo</CardTitle>
              <CardDescription>
                Espaço reservado para tema, moeda e demais ajustes de uso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Conteúdo provisório.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
