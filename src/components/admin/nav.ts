import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: string; permission?: Permission; future?: boolean };

/** Menu do painel. Itens "future" pertencem à V2 e aparecem desabilitados. */
export const ADMIN_NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operação",
    items: [
      { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/admin/agenda", label: "Agenda", icon: "CalendarDays" },
      { href: "/admin/agendamentos", label: "Agendamentos", icon: "ClipboardList" },
      { href: "/admin/clientes", label: "Clientes", icon: "Users" },
    ],
  },
  {
    section: "Acervo",
    items: [
      { href: "/admin/catalogo", label: "Catálogo", icon: "Shirt" },
      { href: "/admin/estoque", label: "Estoque", icon: "Boxes" },
    ],
  },
  {
    section: "Sistema",
    items: [
      { href: "/admin/impressoes", label: "Impressões", icon: "Printer" },
      { href: "/admin/notificacoes", label: "Notificações", icon: "Bell" },
      { href: "/admin/configuracoes", label: "Configurações", icon: "Settings", permission: "settings.manage" },
      { href: "/admin/auditoria", label: "Auditoria", icon: "ShieldCheck", permission: "audit.view" },
    ],
  },
  {
    section: "Em breve (V2)",
    items: [
      { href: "/admin/v2/locacoes", label: "Locações", icon: "FileSignature", future: true },
      { href: "/admin/v2/retiradas", label: "Retiradas", icon: "PackageCheck", future: true },
      { href: "/admin/v2/devolucoes", label: "Devoluções", icon: "Undo2", future: true },
      { href: "/admin/v2/lavanderia", label: "Lavanderia", icon: "WashingMachine", future: true },
      { href: "/admin/v2/manutencao", label: "Manutenção", icon: "Scissors", future: true },
      { href: "/admin/v2/financeiro", label: "Financeiro", icon: "Wallet", future: true },
      { href: "/admin/v2/relatorios", label: "Relatórios", icon: "BarChart3", future: true },
    ],
  },
];
