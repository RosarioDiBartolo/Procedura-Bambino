import { Link } from "react-router-dom";

export function DepartmentIdentity({ simulation }: { simulation: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
      <Link to={simulation} className="flex items-center gap-2 rounded-sm leading-tight">
        <img className="size-10 shrink-0 rounded-lg bg-chrome-white object-contain p-0.5" src="/brand/utin-rodolico.png" alt="" />
        <div>
          <strong className="block text-sm text-chrome-white">UTIN e Neonatologia</strong>
          <span className="block text-[10px] text-chrome-foreground">P.O. «G. Rodolico» · Catania</span>
        </div>
      </Link>
      <div className="flex min-w-0 items-center gap-2 border-l border-chrome-divider pl-3 leading-tight">
        <div className="size-8 shrink-0 overflow-hidden rounded-md bg-chrome-white">
          <img className="size-full scale-[1.55] object-cover" src="/brand/policlinico-rodolico.png" alt="" />
        </div>
        <div>
          <span className="block text-[10px] text-chrome-foreground">Azienda Ospedaliero Universitaria</span>
          <strong className="block text-xs text-chrome-white">Policlinico «G. Rodolico – San Marco»</strong>
        </div>
      </div>
    </div>
  );
}
