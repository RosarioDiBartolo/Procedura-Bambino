# Nido — simulazione NLS

Un’unica applicazione React, TypeScript e Vite. Guida della procedura con audio preregistrati, senza AI, chat, microfono o server API. Prototipo per simulazione con dati fittizi, non validato per uso assistenziale.

## Avvio

Richiede Node.js 22. Dalla radice:

```sh
npm ci
npm run dev
```

Aprire http://localhost:5180. Tutti i comandi si eseguono dalla radice:

```sh
npm test
npm run build
npm run preview
```

La compilazione produce `dist/`. Non ci sono workspace npm o app secondarie.

## Struttura

```text
src/                  Codice React, flusso, sessione, audio e report
  pages/              Pagine della procedura
  components/ui/      Componenti dell’interfaccia
  components/icons8.tsx  Icone dell’app
  assets/             Foto, illustrazioni e icone importate dal codice
  styles/             Token e configurazione Tailwind
public/               File pubblicati con percorsi stabili
  audio/qwen/         Registrazioni WAV esistenti
  brand/              Logo e favicon
  sources/            Immagine del poster
fonti/                PDF originale SIN 2025
docs/                 Materiali di lavoro, anteprime, script e notebook audio
index.html            Ingresso dell’app
vite.config.ts        Sviluppo, compilazione e test
```

I componenti UI e le utility appartengono all’app e usano l’alias `@/`. `components.json` configura shadcn sulla stessa struttura. Vite serve il poster PDF da `fonti/` e lo include in `dist/sources/`, senza duplicarne la sorgente.

## Guida vocale

La voce è attiva per impostazione predefinita, salvo disattivazione salvata sul dispositivo. Ogni ingresso nello step tenta la riproduzione dopo 500 ms. Cambiare step interrompe subito l’audio precedente; cambiare nuovamente step, Interrompi o Disattiva annullano anche gli avvii in attesa. Ascolta / Ripeti è immediato. Se il browser blocca l’avvio automatico, un messaggio visibile invita a premere Ascolta.

Si usano esclusivamente i WAV in `public/audio/qwen`. Per rigenerare le registrazioni con i 23 testi aggiornati, segui `docs/audio/README.md`. Le registrazioni attuali restano quelle precedenti finché non vengono sostituite con i nuovi WAV. Nessun contenuto viene inviato a servizi esterni per riprodurre la voce.

## Sessione e report

La sessione resta in `sessionStorage` nella stessa scheda e non è sincronizzata tra dispositivi. Le scelte e le transizioni sono manuali; la voce non esegue decisioni.

Scarica report genera un documento HTML autonomo con riepilogo, tempi, valutazioni e cronologia. Aprirlo nel browser e usare Stampa / Salva PDF per produrre un PDF A4. Esporta JSON mantiene separati i dati strutturati. I due comandi sono disponibili dal registro, dalla conclusione e prima di azzerare la sessione. Il report non certifica l’esecuzione o l’efficacia degli interventi.

## Deploy Vercel

Root Directory: radice del repository. `vercel.json` configura `npm ci`, `npm run build` e output `dist/`. Branch produzione: `main`. Nessuna variabile d’ambiente o chiave API richiesta. Il routing hash non necessita di riscritture. Gli aggiornamenti su `main` avviano il deploy automatico.

## Versione AI conservata

Il branch `codex/ai-preserved` conserva il lavoro AI precedente alla semplificazione. È indipendente dalla struttura corrente e non viene pubblicato sul sito di produzione.

## Preparazione del rilascio

`npm run check` verifica risorse e integrità degli audio, esegue i test e compila l’app. La procedura GitHub esegue gli stessi controlli. La guida rapida, la privacy e le note legali sono raggiungibili dal footer.

Il registro delle verifiche e delle condizioni ancora da chiudere per la beta pubblica è in [docs/RELEASE.md](docs/RELEASE.md). L’app dichiara la revisione comunicata dal gestore senza presentarla come validazione per uso assistenziale.
