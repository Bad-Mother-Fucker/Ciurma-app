interface Props {
  messaggio: string | null;
  onChiudi: () => void;
}

/** Banner di errore non colpevolizzante: dice cosa è successo, non punta il dito. */
export function BannerErrore({ messaggio, onChiudi }: Props) {
  if (!messaggio) return null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-secca/10 px-3 py-2 text-13 text-secca">
      <span>{messaggio}</span>
      <button type="button" onClick={onChiudi} className="touch-target shrink-0 font-medium">
        Chiudi
      </button>
    </div>
  );
}
