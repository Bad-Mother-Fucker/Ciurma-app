import { GIORNI } from '../lib/giorni';

interface Props {
  selezionati: number[];
  onCambia: (giorni: number[]) => void;
}

/** Selettore visuale L M M G V S D per i giorni della settimana. */
export function SelettoreGiorni({ selezionati, onCambia }: Props) {
  const alterna = (giorno: number) => {
    if (selezionati.includes(giorno)) onCambia(selezionati.filter((g) => g !== giorno));
    else onCambia([...selezionati, giorno]);
  };

  return (
    <div className="flex gap-1" role="group" aria-label="Giorni della settimana">
      {GIORNI.map((g) => {
        const attivo = selezionati.includes(g.valore);
        return (
          <button
            key={g.valore}
            type="button"
            aria-pressed={attivo}
            aria-label={g.nomeCompleto}
            onClick={() => alterna(g.valore)}
            className={`touch-target flex h-9 w-9 items-center justify-center rounded-full text-13 font-semibold ${
              attivo ? 'bg-rotta text-white' : 'bg-salso text-fondale/60'
            }`}
          >
            {g.lettera}
          </button>
        );
      })}
    </div>
  );
}
