# Assistente AI: conversazione diretta Realtime

## Avvio

Richiede Node 22.18+, browser con WebRTC, connessione internet e una chiave OpenAI. Copiare `.env.example` in `.env` dentro `prototipo-02`, impostare `OPENAI_API_KEY`, avviare `npm run dev` dalla radice e aprire http://127.0.0.1:5180. Riavviare il server dopo questa migrazione. I modelli configurabili sono `OPENAI_REALTIME_MODEL` e `OPENAI_TRANSCRIPTION_MODEL`; il dialogo non usa un modello Responses separato. La chiave principale rimane sul server.

L’assistente si avvia con audio in uscita e microfono spento quando il servizio è configurato. **Avvia ascolto** richiede il microfono e collega la traccia alla stessa sessione. **Disattiva microfono** rilascia l’ingresso, mantenendo le spiegazioni AI. **Disattiva assistente**, conclusione, nuova simulazione o chiusura della pagina terminano la connessione e le tracce. **Rispiega questo step** funziona anche senza ascolto. Il browser può richiedere una prima interazione per riprodurre l’audio: è possibile riavviare la spiegazione dal pannello.

La precedente guida vocale è stata rimossa: non sono utilizzati sintesi vocale del browser o audio preregistrati. HTTPS rimane escluso; l’API locale è su 127.0.0.1:5181. L’accesso HTTP dalla rete permette di usare l’interfaccia; non abilita il microfono remoto.

## Conversazione e sincronizzazione

Realtime riceve direttamente l’audio nella propria conversazione e genera le risposte vocali. Il Controller ordina le trascrizioni, attende il completamento del turno e una pausa di 350 ms. La trascrizione serve come evidenza delle azioni e per ordinare i turni; non viene inviata a un secondo modello testuale. Le interruzioni cancellano generazione, riproduzione e richieste degli strumenti superate.

Ogni richiesta a Realtime rilegge i prompt dal filesystem e riceve l’intera procedura, gli approfondimenti, i box, i riferimenti, lo step attivo, le osservazioni della visita e la prima informazione mancante. Le istruzioni sono applicate alla singola risposta; il contesto nativo, compreso l’audio, rimane nella conversazione.

Per ciascun turno utente il primo completamento Realtime produce esclusivamente strumenti, senza audio. Il codice esegue insieme le chiamate soltanto dopo `response.done` con stato `completed`: gli argomenti parziali o quelli di una risposta cancellata non autorizzano azioni. Gli strumenti vengono validati dal server e applicati dall’app; solo dopo la sincronizzazione dello stato effettivo viene richiesta la risposta audio nella stessa conversazione Realtime. Questa fase serve a impedire annunci vocali di cambiamenti non ancora applicati. La risposta vocale è composta direttamente da Realtime, senza un testo clinico precomposto da leggere.

Se cambia step, i risultati degli strumenti vengono restituiti prima della nuova introduzione. Non viene generato un riepilogo del bivio né richiesta una seconda conferma. Introduzioni e ripetizioni sono risposte audio dirette, senza registrare azioni. Gli aggiornamenti delle spunte non fanno ripartire le introduzioni.

L’interfaccia mostra soltanto l’ultimo scambio: ultima trascrizione utente, indicazione prevista per la risposta e trascrizione audio progressiva effettivamente ricevuta, con segnalazione dell’interruzione. Quest’ultima non certifica cosa sia stato fisicamente ascoltato. Il server conserva gli ultimi otto scambi ricevuti in memoria; i dati riconosciuti e gli effetti applicati restano nel registro della simulazione.

## Strumenti e regole

| Strumento | Controllo applicativo |
|---|---|
| `aggiorna_osservazioni` | Valida insieme i riscontri finali del turno e calcola il ramo |
| `conferma_interventi` | Registra gli indici degli interventi dichiarati completati |
| `completa_step` | Calcola il seguito operativo senza dedurre somministrazioni |
| `registra_evento` | Verifica nascita, somministrazione o conclusione esplicite nei passaggi disponibili |
| `torna_indietro` | Registra una correzione e torna al passo precedente |
| `riferimenti_fonti` | Identifica le fonti usate anche su altri step, senza mutare dati clinici |

Nessuno strumento accetta una destinazione dal modello. `assessment.ts` contiene le stesse regole usate dai campi manuali. Gli sconosciuti rimangono tali; le soglie verbali non diventano numeri. Esattamente 60 e 100 appartengono ai rami almeno 60 e almeno 100. Una condizione positiva certa può risolvere un “oppure”; per escluderlo servono tutti i riscontri. La ventilazione efficace deve essere esplicitamente confermata prima delle compressioni; se è dichiarata inefficace si torna ai correttivi.

Sessione, visita, revisione, turno e ID delle chiamate proteggono da duplicati e risultati superati. Una nuova visita richiede nuove misurazioni. Il server non conserva osservazioni speculative prima che l’app abbia applicato e sincronizzato il proprio contesto. Frasi ipotetiche, domande e incertezze non confermano osservazioni. Nello stesso turno le correzioni finali sostituiscono quelle precedenti. Una dose esplicitamente dichiarata e una richiesta di avanzamento possono essere applicate insieme; il semplice completamento non registra mai una dose.

Le scelte manuali restano disponibili. I numeri vengono confermati con Invio o uscendo dal campo, sì/no subito. I dati mostrano provenienza e istante dell’aggiornamento. Le vecchie sessioni senza i nuovi campi continuano a essere ripristinabili.

## Personalizzazione

- `server/prompts/general.md`: stile, lingua, dialogo, fonti e uso degli strumenti.
- `server/prompts/steps/*.md`: 18 prompt per introduzione e dialogo locale.
- `src/procedureKnowledge.ts` e `src/interventionDetails.ts`: approfondimenti condivisi con l’interfaccia.
- `src/assistant/guidelines.ts`: catalogo dei riferimenti.
- `src/assistant/realtime-tools.ts`: contratti degli strumenti.
- `server/native-realtime.ts`: contesto completo e validazione dei gruppi di chiamate.

I Markdown sono riletti per ogni risposta, senza ricompilazione né riavvio. Esempi: «usa il tu e frasi brevi» nel generale; «presenta i tre interventi come elenco parlato» in preparation; «chiedi esplicitamente la conferma del team» in hr60. I prompt non modificano soglie, collegamenti o prerequisiti. L’assistente descrive direttamente la procedura senza citare il poster nel parlato; i riferimenti rimangono disponibili nell’interfaccia.

Gli endpoint della pipeline precedente sono conservati per compatibilità con il prototipo. Il client attuale non chiama `decide`, `enter` o `turn`, ma `realtime-config`, `utterance`, `realtime-tools`, `exchange` e `context`.

## Verifica e limiti

`npm run test:react` esercita regole e dialoghi con interpretazioni e audio simulati, contratti degli strumenti, batch atomici, valori 60/100, incertezze, correzioni, vincoli della ventilazione, eventi espliciti, replay, risposte cancellate, risultati tardivi, sincronizzazione UI, trascrizioni e gestione del microfono. Gli handler HTTP vengono esercitati in memoria. `npm run build` controlla TypeScript e compila l’interfaccia.

Le prove automatiche non verificano qualità e latenza del parlato reale né la correttezza semantica del modello. Il tentativo reale precedente è fallito per un errore di rete dell’ambiente; questa migrazione deve ancora essere collaudata con microfono e provider reali. Il modello può interpretare male una dichiarazione o formulare frasi non supportate: i vincoli sullo stato non costituiscono validazione del parlato.

Il sistema resta un prototipo di simulazione; questa estensione non costituisce validazione clinica.
