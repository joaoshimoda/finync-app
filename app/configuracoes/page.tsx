import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const settingsSections = [
  {
    value: "perfil",
    label: "Perfil",
    title: "Dados do perfil",
    description:
      "Espaço reservado para informações do usuário, identificação da conta e preferências pessoais.",
  },
  {
    value: "preferencias",
    label: "Preferências",
    title: "Preferências do aplicativo",
    description:
      "Aqui ficarão as opções de tema, moeda padrão, notificações e demais ajustes de uso.",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-8">
      <header className="rounded-[2rem] border border-white/[0.08] bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8">
        <p className="text-sm font-medium text-brand-300">Configurações</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Ajustes da conta
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
          Estrutura inicial para centralizar dados do usuário e preferências do
          Finync.
        </p>
      </header>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          {settingsSections.map((section) => (
            <TabsTrigger key={section.value} value={section.value}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {settingsSections.map((section) => (
          <TabsContent key={section.value} value={section.value}>
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {section.description}
              </p>
              <div className="mt-6 rounded-2xl border border-dashed border-white/[0.12] bg-black/20 p-5 text-sm text-zinc-500">
                Conteúdo provisório. Esta seção receberá os controles definitivos nas
                próximas etapas.
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
