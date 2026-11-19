import { steps, type StepId } from "./flow.ts";
import { preparationDetails } from "./interventionDetails.ts";
export type InterventionDetail = {
  panel: string;
  title: string;
  art: string;
  summary: string;
  intro: string;
  sections: readonly (readonly [string, string])[];
  takeaway: string;
};
type Explanation = readonly [
  summary: string,
  explanation: string,
  coordination: string,
];
const explanations: Record<string, Explanation> = {
  "Gestione cordone ombelicale": [
    "Concordare tempi e gestione del cordone senza ritardare l’assistenza.",
    "Il poster indica di attendere almeno 60 secondi prima del clampaggio e di considerare il milking nei neonati depressi tra 35 e 42 settimane. Queste indicazioni vanno contestualizzate dal team.",
    "Condividi il piano e segnala il tempo trascorso dalla nascita. La gestione del cordone non deve ritardare gli interventi necessari.",
  ],
  "Skin to skin": [
    "Assistere il contatto con il genitore e continuare l’osservazione.",
    "Il contatto skin to skin appartiene al ramo in cui il team ha riscontrato le condizioni previste dal percorso. Non equivale alla conclusione dell’osservazione.",
    "Concorda con il team il supporto alla famiglia e comunica qualsiasi cambiamento osservato.",
  ],
  "Controllo della temperatura": [
    "Mantenere l’attenzione sulla temperatura durante l’assistenza.",
    "Il poster richiama il controllo della temperatura e riporta l’intervallo 36,5–37,5 °C. Il riscontro e le misure adottate restano responsabilità del team.",
    "Verifica con il team le modalità di rilevazione e riferisci il dato osservato; l’app non misura la temperatura.",
  ],
  "Valutazione continua": [
    "Osservare la risposta del neonato anche dopo la prima valutazione.",
    "La situazione può cambiare durante l’osservazione. Una valutazione iniziale favorevole non sostituisce le successive rivalutazioni del team.",
    "Condividi i cambiamenti rilevati. Il comando Nuova valutazione permette di riprendere il percorso nello scenario.",
  ],
  "Fornire calore e mantenere la temperatura": [
    "Preparare e mantenere il supporto termico previsto.",
    "Il mantenimento della temperatura è uno dei primi interventi del poster. Organizza l’ambiente e il materiale previsto dalla struttura per il ruolo assegnato.",
    "Concorda con il team il controllo della temperatura e segnala problemi del materiale o del supporto disponibile.",
  ],
  Asciugare: [
    "Collaborare all’asciugatura durante i primi interventi.",
    "L’asciugatura è elencata tra i primi interventi e si inserisce nel mantenimento della temperatura. Questa scheda non descrive tecniche o eccezioni per specifiche età gestazionali.",
    "Segui le indicazioni del team e il protocollo locale per lo scenario.",
  ],
  "Posizione idonea per la pervietà delle vie aeree": [
    "Verificare con il team la posizione e la pervietà delle vie aeree.",
    "Il poster richiama una posizione idonea delle vie aeree sia nei primi interventi sia nel supporto respiratorio. La valutazione dell’efficacia resta al team.",
    "Comunica l’esito osservato e prepara eventuali correzioni secondo il ruolo assegnato.",
  ],
  "Rimuovere le secrezioni se necessario": [
    "Valutare la necessità della rimozione delle secrezioni.",
    "Il poster specifica “se necessario”: la rimozione delle secrezioni non va presentata come un’azione automatica per ogni neonato.",
    "Concorda la necessità con il team e segui le modalità previste localmente; questa scheda non aggiunge una tecnica esecutiva.",
  ],
  Stimolare: [
    "Collaborare alla stimolazione prevista nei primi interventi.",
    "La stimolazione compare nel gruppo dei primi interventi, prima della valutazione di apnea, gasping e frequenza cardiaca.",
    "Segui il ruolo concordato e comunica la risposta osservata, senza ritardare la rivalutazione.",
  ],
  Riposizionare: [
    "Rivalutare la posizione dopo i primi interventi.",
    "Il riposizionamento è richiamato dal poster prima della successiva valutazione respiratoria. Non rappresenta una conferma automatica della pervietà o della ventilazione.",
    "Concorda il controllo con il team e comunica ciò che è stato corretto.",
  ],
  "Monitoraggio SpO₂": [
    "Confrontare la saturazione preduttale con il tempo dalla nascita.",
    "Il supporto Target SpO₂ riporta i riferimenti del poster per i primi minuti di vita. Non sono target universali per altri contesti assistenziali.",
    "Il team rileva e interpreta i dati. L’app non legge il monitor e il timer parte dalla nascita confermata nello scenario.",
  ],
  "Supplementazione O₂": [
    "Collaborare alla supplementazione di ossigeno concordata.",
    "Il poster include la supplementazione di ossigeno nel ramo del supporto respiratorio. Regolazioni e valutazione della risposta competono al team.",
    "Concorda il supporto richiesto e riferisci i riscontri del monitoraggio secondo il ruolo assegnato.",
  ],
  "Considerare CPAP": [
    "Valutare con il team la necessità di CPAP.",
    "La CPAP è indicata come opzione da considerare nel ramo con respiro difficoltoso o cianosi persistente. Non viene avviata dall’app.",
    "Prepara il materiale solo secondo le indicazioni del team e le procedure della struttura.",
  ],
  PPV: [
    "Eseguire o assistere la ventilazione a pressione positiva.",
    "Il percorso conduce alla PPV in presenza di apnea o gasping oppure frequenza cardiaca inferiore a 100/min. Dopo il supporto è prevista una rivalutazione della frequenza cardiaca.",
    "Segui il ruolo assegnato. L’efficacia della ventilazione è valutata dal team, non dedotta dal passaggio alla schermata successiva.",
  ],
  "Considerare monitoraggio ECG": [
    "Valutare con il team l’attivazione del monitoraggio ECG.",
    "Il poster indica di considerare il monitoraggio ECG durante la PPV. La disponibilità del dispositivo e l’interpretazione del riscontro restano al team.",
    "Prepara il materiale richiesto e comunica quando il monitoraggio è disponibile o presenta problemi.",
  ],
  "Correttivi della ventilazione": [
    "Rivalutare gli elementi che possono rendere inefficace la ventilazione.",
    "Il supporto MR SOPA richiama maschera, posizione, secrezioni, apertura della bocca, pressioni e via aerea alternativa. La risposta va verificata dopo le correzioni.",
    "Apri MR SOPA per il promemoria e condividi con il team gli interventi verificati. La spunta non certifica l’efficacia.",
  ],
  "Se necessario tubo tracheale o maschera laringea": [
    "Preparare una via aerea alternativa se richiesta dal team.",
    "Il poster include tubo tracheale o maschera laringea quando necessari dopo i correttivi. Questa scheda non fornisce una tecnica di posizionamento.",
    "Prepara il materiale secondo il protocollo locale e il ruolo assegnato, comunicando disponibilità e criticità.",
  ],
  "Monitor ECG": [
    "Attivare o assistere il monitoraggio concordato.",
    "Il monitoraggio ECG accompagna la rivalutazione dopo i correttivi nel poster. La lettura del monitor non è integrata in questa applicazione.",
    "Riferisci al team i riscontri effettivamente rilevati e i problemi del dispositivo.",
  ],
  "O₂ al 100%": [
    "Collaborare all’ossigeno al 100% nel ramo delle compressioni.",
    "Il poster riporta O₂ al 100% nel blocco delle compressioni coordinate con PPV. L’indicazione appartiene a questo punto del percorso.",
    "Verifica con il team l’impostazione del supporto e segnala eventuali problemi della fonte o del dispositivo.",
  ],
  "Tubo tracheale o maschera laringea": [
    "Collaborare alla gestione della via aerea nel supporto avanzato.",
    "Il poster richiama una via aerea tramite tubo tracheale o maschera laringea nel blocco delle compressioni. Scelta e gestione competono al team.",
    "Assisti secondo il ruolo concordato e riferisci qualsiasi difficoltà; l’illustrazione non è una guida al posizionamento.",
  ],
  "Compressioni toraciche coordinate con PPV": [
    "Coordinare compressioni e ventilazione secondo i ruoli assegnati.",
    "Nel percorso si accede a questo passaggio solo dopo la conferma del team di ventilazione efficace e il caso con frequenza cardiaca inferiore a 60/min.",
    "Mantieni la comunicazione con gli altri operatori e prepara la successiva rivalutazione. Questa scheda non aggiunge rapporti o tecniche non riportati nel flusso.",
  ],
  "Monitoraggio ECG": [
    "Condividere i riscontri del monitoraggio durante il supporto avanzato.",
    "Il monitoraggio ECG è richiamato nel blocco delle compressioni. Il dato deve essere rilevato e interpretato dal team.",
    "Comunica i riscontri reali per la rivalutazione successiva. Non si ricavano valori dal timer o dalla navigazione.",
  ],
  "Considerare CVO o IO": [
    "Preparare il materiale per l’accesso indicato dal team.",
    "Il poster indica di considerare catetere venoso ombelicale o accesso intraosseo nel supporto avanzato. L’app non sceglie la via e non descrive la tecnica.",
    "Concorda il materiale necessario e segnala quando è disponibile secondo l’organizzazione della struttura.",
  ],
  "Adrenalina in CVO o IO ogni 3–5 min": [
    "Registrare la somministrazione solo dopo conferma del team.",
    "Il poster richiama adrenalina per via CVO o IO ogni 3–5 minuti. La scheda non aggiunge dosi o concentrazioni: verifica prescrizione e modalità con il team.",
    "Il pulsante Registra somministrazione avvia il riferimento temporale nello scenario; non costituisce una prescrizione né un ordine di somministrare.",
  ],
  "Se FC <60/min persistente, considerare ipovolemia": [
    "Collaborare alla valutazione dell’ipovolemia se la FC resta inferiore a 60/min.",
    "L’ipovolemia è una possibilità da considerare nel blocco dell’adrenalina del poster. Il percorso non formula una diagnosi e non propone volumi da somministrare.",
    "Riferisci al team le osservazioni disponibili e prepara quanto richiesto secondo le indicazioni ricevute.",
  ],
  "Rivalutazione DOPPES": [
    "Ripercorrere le possibili cause di ventilazione inefficace.",
    "DOPPES richiama dislocazione, ostruzione, pressioni, pneumotorace, strumentazione e aria nello stomaco. È un promemoria per la rivalutazione del team.",
    "Apri il supporto DOPPES per le voci complete. Ogni spunta registra una verifica nello scenario, senza escludere automaticamente una causa.",
  ],
  "Risposta del neonato rivalutata con il team": [
    "Concordare il successivo supporto dopo la rivalutazione.",
    "Il ramo con frequenza cardiaca almeno 60/min dopo il supporto avanzato non è tracciato completamente nel poster. Questa pagina rende esplicito il limite della trasposizione.",
    "Comunica la frequenza cardiaca osservata, rivaluta il respiro con il team e concorda la prosecuzione senza dedurla automaticamente dal diagramma.",
  ],
  "Cure post-rianimatorie": [
    "Proseguire l’assistenza secondo il piano concordato dal team.",
    "Il poster richiama le cure post-rianimatorie senza dettagliare in questa pagina un protocollo completo. La prosecuzione richiede le indicazioni del team e della struttura.",
    "Condividi valutazioni, interventi e tempi disponibili per la continuità dell’assistenza nello scenario.",
  ],
  "Debriefing del team": [
    "Rivedere insieme sequenza, comunicazione e coordinamento.",
    "Il debriefing permette di ricostruire quanto accaduto nello scenario, confrontare le osservazioni e individuare aspetti da migliorare.",
    "Usa il registro come supporto alla discussione. Contiene ciò che è stato confermato nell’app e non certifica ogni attività effettivamente svolta.",
  ],
};
export function getInterventions(step: StepId): readonly InterventionDetail[] {
  if (step === "preparation") return preparationDetails;
  return (steps[step].actions ?? []).map((title, index) => {
    const detail = explanations[title];
    if (!detail)
      throw new Error(`Approfondimento mancante: ${step} / ${title}`);
    return {
      panel: `intervention-${index}`,
      title,
      art: "",
      summary: detail[0],
      intro: detail[1],
      sections: [
        ["Nel percorso", steps[step].subtitle],
        ["Coordinamento del team", detail[2]],
      ],
      takeaway:
        "Condividi con il team quanto osservato e gli interventi confermati nello scenario.",
    };
  });
}
export type ActionPanel = `intervention-${number}`;
export function isActionPanel(panel: string | null): panel is ActionPanel {
  return /^intervention-\d+$/.test(panel ?? "");
}
