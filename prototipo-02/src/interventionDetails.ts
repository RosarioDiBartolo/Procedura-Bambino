export const preparationDetails = [
  {
    panel: "counseling",
    title: "Counseling prenatale",
    art: "pregnancy",
    summary:
      "Condividere con la famiglia cosa aspettarsi e raccogliere gli elementi utili al team.",
    intro:
      "Un momento di confronto prima della nascita, per ascoltare la famiglia e rendere comprensibile l’assistenza prevista per il neonato.",
    sections: [
      [
        "Ascoltare e chiarire",
        "Invita i genitori a esprimere domande e preoccupazioni. Usa parole semplici e verifica che il significato delle informazioni sia stato compreso.",
      ],
      [
        "Spiegare il contesto",
        "Presenta il ruolo del team e il motivo della sua presenza. Condividi le informazioni disponibili sullo scenario e gli eventuali aspetti ancora incerti, senza anticipare esiti non prevedibili.",
      ],
      [
        "Condividere con il team",
        "Riporta al briefing le informazioni pertinenti e le domande emerse, nel rispetto dei ruoli e della riservatezza. Il confronto con la famiglia non sostituisce il briefing operativo.",
      ],
    ],
    takeaway:
      "Prima di proseguire: famiglia informata e domande rilevanti condivise con il team.",
  },
  {
    panel: "briefing",
    title: "Briefing del team",
    art: "team",
    summary: "Allineare scenario, ruoli e comunicazione prima della nascita.",
    intro:
      "Un confronto breve e condiviso permette a ogni componente del team di conoscere il proprio compito e il piano concordato per lo scenario.",
    sections: [
      [
        "Condividere lo scenario",
        "Riepiloga le informazioni disponibili e gli elementi che il team ritiene rilevanti. Esplicita ciò che manca o deve essere ancora verificato.",
      ],
      [
        "Assegnare i compiti",
        "Concorda chi coordina e come vengono distribuite assistenza, preparazione del materiale e comunicazione. Ogni persona conferma il ruolo assegnato.",
      ],
      [
        "Concordare il coordinamento",
        "Chiarisci come comunicare valutazioni e richieste e come attivare ulteriore aiuto secondo l’organizzazione della struttura. Rendi espliciti eventuali dubbi prima di iniziare.",
      ],
    ],
    takeaway: "Prima di proseguire: ruoli chiari e piano condiviso da tutti.",
  },
  {
    panel: "equipment",
    title: "Checklist del materiale",
    art: "checklist",
    summary:
      "Verificare disponibilità, funzionamento e accessibilità del materiale previsto.",
    intro:
      "La preparazione non consiste solo nel trovare il materiale: il team deve sapere dove si trova, chi lo controlla e se è pronto per lo scenario.",
    sections: [
      [
        "Usare la checklist della struttura",
        "Segui l’elenco previsto localmente per la postazione e lo scenario. Questa scheda descrive l’organizzazione della verifica e non sostituisce una checklist tecnica completa.",
      ],
      [
        "Confermare che sia pronto",
        "Verifica disponibilità e funzionamento con le modalità previste dalla struttura e dal dispositivo. Organizza il materiale in modo che sia accessibile agli operatori incaricati.",
      ],
      [
        "Segnalare le criticità",
        "Comunica subito materiale mancante, guasti o verifiche non completate. Concorda con chi coordina come risolvere la criticità e conferma la preparazione al team.",
      ],
    ],
    takeaway:
      "Prima di proseguire: controlli completati e criticità comunicate.",
  },
] as const;
export type InterventionPanel = (typeof preparationDetails)[number]["panel"];
export function isInterventionPanel(
  panel: string | null,
): panel is InterventionPanel | `intervention-${number}` {
  return (
    preparationDetails.some((item) => item.panel === panel) ||
    /^intervention-\d+$/.test(panel ?? "")
  );
}
