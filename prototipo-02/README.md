# Prototipo 02 — assistente di procedura NLS

**Assistente AI proattivo:** [avvio, architettura, limiti e 30 scenari di collaudo](VOICE_ASSISTANT.md). Per avviare insieme frontend e server vocale, usare `npm run dev` dalla cartella principale del repository. L'avvio Vite da questa sottocartella serve solo l'interfaccia. L'assistente AI ha un'attivazione separata dalla guida vocale descritta sotto e invia audio/trascrizioni a OpenAI dopo consenso all'avvio.

Nuovo prototipo indipendente da Nido. React, TypeScript, Vite, Tailwind CSS e componenti ufficiali shadcn/ui aggiunti dal relativo registro: Button, Card, Badge, Checkbox, Dialog, Tabs, Separator, Input, Label e Alert. I componenti sono adattabili nel codice del progetto. Nessun documento decisionale del prototipo 01 è stato adottato come specifica.

L'indipendenza riguarda i flussi e le decisioni. Componenti, asset e design system sono in `../shared/`: l'app importa la libreria `@nls/ui` e i token comuni. Installazione e dipendenze sono gestite dal workspace principale; eseguire `npm install` dalla cartella superiore.

## Avvio

```powershell
npm install
npm run dev -- --port 5180
```

Aprire `http://127.0.0.1:5180/`. Per la versione compilata: `npm run build`, poi `npm run preview`. I PDF e le immagini necessarie sono serviti localmente; non si carica il prototipo React aprendo direttamente `index.html` dal filesystem.

## Struttura operativa

Un solo passaggio attivo, checklist delle azioni, valutazioni esplicite, timer dalla nascita e dal passaggio corrente, registro cronologico, accesso immediato a Box 1 (SpO₂), Box 2 (MR SOPA), Box 3 (DOPPES), diagramma originale consultabile in sovrapposizione. Il timer del farmaco parte soltanto dalla registrazione della somministrazione nello scenario. La richiesta di aiuto è un promemoria e una conferma documentale, non una chiamata.

Il modello dei passaggi e dei rami è in `src/flow.ts`; non è un atlante o un catalogo di argomenti. La fonte della trasposizione è `../fonti/Poster Rianimazione 2025 DEFINITIVO.pdf`. Vite serve il PDF direttamente dalla cartella delle fonti in sviluppo e lo emette nel bundle di produzione, senza duplicati sorgente locali. Gli asset generati sono in `../shared/assets/`.

## Corrispondenza con il poster

| Dal diagramma | Implementazione |
|---|---|
| Counselling, briefing, checklist | Passaggio preparazione |
| Nascita | Registrazione ora dichiarata, anche con minuti già trascorsi |
| Gestione cordone | Passaggio dedicato e richiamo dei messaggi del poster |
| Termine / tono / respiro-pianto | Tre valutazioni esplicite; tutti SÌ o almeno un NO |
| Skin to skin e osservazione | Checklist e nuova valutazione su richiesta |
| Primi passi | Sei azioni del riquadro |
| Apnea/gasping o FC <100 | Bivio con FC e valutazione del respiro |
| Respiro difficoltoso / cianosi | Bivio e relativo ramo di supporto |
| PPV | Azioni, monitoraggio e accesso Box 1 |
| FC <100 dopo PPV | SÌ verso correttivi, NO verso cure successive |
| Correttivi | Riquadro e Box 2 completo consultabile e spuntabile |
| FC <60 dopo correttivi | SÌ verso compressioni con conferma di ventilazione efficace; NO al bivio FC <100 |
| Compressioni | Cinque azioni del riquadro |
| FC <60 avanzato | SÌ verso farmaco / cause reversibili |
| Adrenalina, ipovolemia, DOPPES | Riquadro, registrazione evento, intervallo 3–5 min del poster, Box 3 e ritorno alla rivalutazione |
| Cure post-rianimatorie / debriefing | Passaggio finale e registro esportabile |
| Normotermia | Promemoria permanente e temperatura dichiarabile |
| Aiuto se serve | Accesso permanente con conferma documentale |
| Pretermine <32 settimane | Richiamo dei parametri del poster quando viene dichiarata l'età gestazionale |

### Ambiguità del disegno non nascoste

Il poster non traccia il ramo NO al bivio FC <60/min dopo le compressioni. L'app mostra un passaggio di rivalutazione del team; un pulsante permette poi una nuova valutazione di respiro e FC, dichiarata come scelta aggiuntiva di navigazione e non come ramo originale del poster. I valori esatti di 60 e 100 seguono la disuguaglianza stretta stampata nei bivi; questa trasposizione non equivale a validazione clinica delle soglie.

Le indicazioni riportate sono quelle del poster: per esempio la finestra 3–5 minuti del farmaco, non la scelta del precedente prototipo ERC/IRC. Non sono state aggiunte dosi, concentrazioni, rapporto compressioni/ventilazioni o criteri tecnici non stampati nel diagramma come se ne facessero parte. Il passaggio sul cordone richiede valutazione del team e non impone di aspettare il timer prima degli interventi necessari.

## Stato e verifiche

Prototipo per simulazione e presentazione con dati fittizi, non validato per assistenza clinica. Il diagramma riguarda la rianimazione alla nascita, non tutte le emergenze UTIN. Spunte ed efficacia delle manovre sono dichiarate dall'operatore; nessuna lettura automatica dei monitor o decisione di interruzione della rianimazione. I timer sono informativi e non cambiano automaticamente il trattamento. Le conferme di checklist sono facoltative per non bloccare la consultazione; il registro non certifica l'esecuzione degli interventi.

La sessione è temporanea in memoria: ricaricando la pagina si perde. È disponibile l'esportazione manuale JSON. Nessun server clinico, autenticazione, collegamento a cartelle o invio dei dati. Il bundle non è una PWA e va servito da un server locale o web.

`npm test`: 17 test su rami, dati mancanti, soglie, prerequisiti, loop, cronologia e interazioni React. `npm run build`: compilazione riuscita. Verifica manuale nel browser effettuata sul percorso preparazione → nascita → cordone → valutazione → primi interventi → PPV → correttivi → compressioni, compreso il blocco senza ventilazione efficace confermata. Anteprima in `../shared/assets/previews/prototipo-02.jpg`. Non ancora verificati tutti i dispositivi o tutti gli scenari tramite browser.

Componenti: https://ui.shadcn.com/docs/installation/vite

### Guida vocale
Nel passaggio corrente, «Attiva guida vocale» abilita la lettura automatica delle procedure e delle richieste di parametri. «Riascolta procedura» funziona anche senza attivare la guida automatica; «Interrompi» ferma la lettura corrente. Le risposte vengono inserite sullo schermo: non viene attivato il microfono. La lettura si interrompe cambiando passaggio, aprendo un pannello o concludendo la simulazione.

La sintesi usa le voci italiane di Web Speech disponibili nel browser e privilegia quelle il cui nome indica Natural, Neural o Online. La selezione è modificabile. Qualità e disponibilità dipendono dal dispositivo; le voci online richiedono una connessione e possono elaborare il testo presso il fornitore del browser. Nessuna chiave API è richiesta. Una voce neurale uniforme su tutti i dispositivi richiede un’integrazione dedicata. I test simulano la sintesi: non certificano la qualità dell’audio reale.

## Routing e sessione (prototipo 02)

Il punto di ingresso React monta React Router (`HashRouter`) e un unico `SessionProvider`, sopra le pagine. URL: `#/procedura/preparation`, `#/procedura/birth`, ecc. I supporti e le finestre usano `?panel=mrsopa`, `?panel=history`, ecc.; la scheda attiva dei supporti deriva dallo stesso parametro, senza un secondo stato potenzialmente incoerente. Il formato hash funziona anche su hosting statico e mantiene corretti gli asset relativi, senza riscritture lato server.

Il contesto contiene passaggio effettivo, eventi, spunte e riferimenti temporali. La navigazione non esegue transizioni del percorso: un URL sconosciuto o un passaggio diverso da quello corrente viene normalizzato con `replace`. Le transizioni della procedura aggiornano l'URL senza costruire una seconda cronologia clinica nel browser. Indietro/avanti del browser può navigare le finestre ma non annulla valutazioni: usare “Passo precedente”, che registra una correzione. Aprire una finestra non smonta la procedura e sospende la lettura vocale tramite il flag esistente.

La sessione viene salvata con chiave versionata in `sessionStorage`: resiste alla ricarica nella stessa scheda. I timestamp assoluti mantengono la continuità dei timer; non si azzerano al cambio pagina. I dati ripristinati vengono controllati; dati corrotti o incompatibili avviano una nuova simulazione. “Azzera e ricomincia” sostituisce anche il salvataggio. Se lo storage è bloccato o pieno l'app continua in memoria, ma la ricarica può perdere gli ultimi dati: esportare il registro.

Non esistono autenticazione, sessione server o sincronizzazione tra dispositivi/schede. Una scheda duplicata può inizialmente ricevere una copia dello storage dal browser, poi le copie sono indipendenti. Gli URL non contengono registro o risposte e non condividono una simulazione con altri utenti. Usare solo dati fittizi; `sessionStorage` non è un archivio protetto. Conferma di ventilazione efficace, messaggi di errore e preferenze di visualizzazione restano temporanei: la conferma va ripetuta dopo una ricarica, mentre aprire un supporto la conserva.

### Approfondimenti della preparazione

Counseling, briefing e checklist del materiale si aprono dalle relative schede, con espansione condivisa di contenitore, titolo e illustrazione tramite Motion (`layoutId`, `LayoutGroup`, `AnimatePresence`). I dettagli sono contenuti didattici redazionali distinti dalle voci del poster, definiti in `src/interventionDetails.ts`. Il dialogo Radix gestisce focus, tastiera e chiusura con Escape; il movimento viene ridotto secondo le preferenze del dispositivo. Le spunte sono controlli separati: aprire un dettaglio non registra attività. Gli URL `?panel=counseling`, `?panel=briefing` e `?panel=equipment` valgono nella preparazione e si ripristinano alla ricarica.

### Struttura delle pagine e transizioni

`App.tsx` è il layout persistente: intestazione, timer, supporti, guida vocale e `<Outlet />`. `Router.tsx` dichiara una route esplicita per ciascuno dei 18 passaggi e una route `/procedura/conclusa`. Ogni route monta il proprio modulo in `src/pages/`; i componenti `StepFrame`, `ActionContent` e `DecisionContent` condividono solo presentazione e controlli riutilizzabili. Non esiste un selettore di schermate basato su `session.step` in App.

`useWorkflow` esegue le transizioni del dominio e chiama esplicitamente `navigate` per proseguire, correggere, registrare la nascita, concludere o azzerare. `navigation.ts` gestisce esclusivamente gli URL dei pannelli; non rispecchia più il passaggio dello stato nell'URL tramite un effetto. Il passaggio salvato nella sessione è un riferimento per ripristino e controllo degli accessi, non il selettore del componente visualizzato. La guardia impedisce salti tramite indirizzi arbitrari senza smontare il layout comune.

Il provider rimane sopra le route: eventi, spunte e timestamp sopravvivono allo smontaggio delle singole pagine. La conferma di ventilazione efficace vive nella sola pagina `HeartRate60` e si azzera quando si esce e si rientra: non viene riutilizzata per una valutazione successiva. L'apertura dei supporti mantiene montata la stessa pagina. Le spunte facoltative restano nella sessione; la loro visibilità è una preferenza locale della pagina. L'azzeramento della sessione ricrea anche i controlli locali della pagina corrente.

### Interventi animati in tutto il percorso

Tutte le 11 pagine con interventi usano `AnimatedInterventions`, senza eccezioni riservate alla preparazione. Ogni voce dispone di sintesi, spiegazione, indicazioni di coordinamento e illustrazione; i testi aggiuntivi sono contenuti didattici e non una checklist clinica validata. Le spiegazioni specifiche sono in `src/actionDetails.ts`; i tre approfondimenti iniziali restano in `src/interventionDetails.ts`.

Gli approfondimenti degli altri passaggi usano `?panel=intervention-0`, `intervention-1`, ecc. L'indice viene validato contro gli interventi della route corrente, anche dopo una ricarica; un indice non valido viene rimosso. Aprire e chiudere un dettaglio non modifica eventi, timestamp o spunte. Le scelte dei bivi restano pulsanti di avanzamento, separati dai dettagli degli interventi.

Il layout segue l'altezza del contenuto: riepilogo con immagine in una fascia orizzontale, schede allineate in alto e comandi subito dopo il contenuto. Su schermi ampi le liste si distribuiscono in due o tre colonne; su mobile passano a una colonna. La sezione centrale può scorrere quando la lista è lunga, mantenendo accessibili i supporti inferiori.
