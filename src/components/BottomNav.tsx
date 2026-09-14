import { NavLink } from 'react-router-dom';

const VOCI = [
  { percorso: '/oggi', etichetta: 'Oggi' },
  { percorso: '/attivita', etichetta: 'Attività' },
  { percorso: '/dispensa', etichetta: 'Dispensa' },
  { percorso: '/spesa', etichetta: 'Spesa' },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-fondale/10 bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Navigazione principale"
    >
      {VOCI.map((voce) => (
        <NavLink
          key={voce.percorso}
          to={voce.percorso}
          className={({ isActive }) =>
            `touch-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[13px] font-medium ${
              isActive ? 'text-rotta' : 'text-fondale/60'
            }`
          }
        >
          {voce.etichetta}
        </NavLink>
      ))}
    </nav>
  );
}
