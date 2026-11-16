# Prototipi del supporto NLS

Assistente AI proattivo nel prototipo React: [configurazione e collaudo](prototipo-02/VOICE_ASSISTANT.md). `npm run dev` avvia interfaccia e API locale; richiede Node.js 22.18+. La voce AI richiede `OPENAI_API_KEY` in `prototipo-02/.env` (esempio incluso). Senza chiave, la procedura e la guida vocale esistente restano utilizzabili.

I prototipi condividono asset e base dell'interfaccia; flussi, contenuti decisionali e documenti di progetto restano specifici di ciascuna versione.

```text
fonti/                   PDF originali: unica fonte dei documenti
shared/
  assets/                Logo, favicon, poster renderizzato e anteprime
  design-system/         Token, temi e stili comuni
  ui/                    Libreria React shadcn (@nls/ui)
prototipo-01/            Nido: versione HTML, flussi e documenti propri
prototipo-02/            React: assistente al flow-chart SIN 2025
```

Dalla cartella principale: `npm install`, poi `npm run dev`. Il secondo prototipo è su `http://127.0.0.1:5180/`. `npm run build` compila la versione React; `npm test` verifica entrambe le versioni e i riferimenti condivisi. Il lockfile delle dipendenze è unico nella cartella principale.

Il primo prototipo resta apribile dal file `prototipo-01/prototipo/index.html`; importa gli stili e gli asset comuni tramite percorsi relativi. Non distribuire la sua sottocartella da sola: occorrono anche `shared/` e `fonti/`.

Con l'anteprima React avviata, è disponibile anche su `http://127.0.0.1:5180/prototipo-01/prototipo/index.html`, usando gli stessi file e asset senza copie aggiuntive. Questo indirizzo del primo prototipo è una comodità del server di sviluppo, non una seconda compilazione React.

Regole di riuso e compatibilità: `shared/README.md`. Le decisioni del prototipo 01 non diventano requisiti del prototipo 02 per il fatto che l'interfaccia è condivisa.
