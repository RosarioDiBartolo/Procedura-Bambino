import { NavLink, Outlet, useMatch } from "react-router-dom";
import { Activity, BookOpen, FileText, Info, Shield } from "lucide-react";
import { DepartmentIdentity } from "./DepartmentIdentity";
import { useSession } from "../SessionContext";
import { sessionPath } from "../navigation";

export function SiteLayout() {
  const [session] = useSession();
  const simulation = sessionPath(session);
  const onProcedure = useMatch("/procedura/*");
  const links = [
    { to: simulation, label: "Simulazione", Icon: Activity },
    { to: "/il-progetto", label: "Il progetto", Icon: Info },
    { to: "/guida", label: "Guida rapida", Icon: BookOpen },
    { to: "/privacy", label: "Privacy", Icon: Shield },
    { to: "/note-legali", label: "Note legali", Icon: FileText },
  ];

  return (
    <div className={onProcedure ? "flex h-dvh flex-col" : "flex min-h-dvh flex-col"}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-chrome-edge bg-chrome px-6 py-2.5 max-[760px]:px-3 max-[760px]:py-2 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-chrome-action">
        <DepartmentIdentity simulation={simulation} />
        <nav className="flex flex-wrap gap-x-4 gap-y-1 max-[760px]:gap-x-2 text-[13px] font-semibold text-chrome-foreground max-[760px]:text-xs" aria-label="Navigazione principale">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-chrome-hover aria-[current=page]:bg-chrome-action aria-[current=page]:text-chrome-action-foreground max-[760px]:px-1.5">
              <Icon size={15} className="shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex basis-full flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-chrome-divider pt-2 text-xs text-chrome-foreground">
          <span className="inline-flex items-baseline gap-2">Ideazione <strong className="text-lg leading-tight font-bold text-chrome-credit max-[760px]:text-base">Marco Di Bartolo</strong></span>
          <span className="inline-flex items-baseline gap-2">Sviluppo <strong className="text-lg leading-tight font-bold text-chrome-credit max-[760px]:text-base">Rosario Di Bartolo</strong></span>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
