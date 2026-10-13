import type { Permission } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: Permission;
  /** Aparece só para quem NÃO tem esta permissão (ex.: Impressões para a equipe) */
  withoutPermission?: Permission;
  /** Outras páginas que acendem este item (ex.: a lista de agendamentos fica dentro da Agenda) */
  also?: string[];
  /** Contador ao lado do nome (preenchido no layout) */
  badgeKey?: "interessados";
};

/** Menu do painel: poucos itens, cada um uma tarefa do dia a dia. */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Hoje", icon: "LayoutDashboard" },
  { href: "/admin/interessados", label: "Interessados", icon: "Sparkles", badgeKey: "interessados" },
  { href: "/admin/agenda", label: "Agenda", icon: "CalendarDays", also: ["/admin/agendamentos"] },
  { href: "/admin/clientes", label: "Clientes", icon: "Users" },
  { href: "/admin/locacoes", label: "Locações", icon: "FileSignature" },
  { href: "/admin/estoque", label: "Estoque", icon: "Boxes", also: ["/admin/catalogo"] },
  { href: "/admin/planilha", label: "Planilha", icon: "Sheet" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "Settings", permission: "settings.manage", also: ["/admin/impressoes", "/admin/notificacoes", "/admin/auditoria"] },
  { href: "/admin/impressoes", label: "Impressões", icon: "Printer", withoutPermission: "settings.manage" },
];
