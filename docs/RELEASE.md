# Rilascio beta didattica pubblica · 0.1.0

Aggiornato il 20 novembre 2026. Questo registro distingue dichiarazioni del gestore, controlli tecnici e verifiche ancora da chiudere. Non è una certificazione clinica o legale.

## Gestione e revisione

- Gestore: Marco Di Bartolo, marcodibartolo@gmail.com.
- Destinazione: beta didattica pubblica, non validata per uso assistenziale.
- Il gestore ha dichiarato in chat il 20 novembre 2026 che Marco Di Bartolo, professionista sanitario, ha fornito il poster e revisionato l’intero percorso attuale, inclusi testi, soglie, scelte e audio. Non è stata acquisita una relazione firmata né svolta una verifica clinica indipendente.
- Per ogni modifica successiva a contenuti o registrazioni, far riesaminare le parti interessate e annotare versione, data ed esito. Conservare il riferimento al commit della versione effettivamente approvata.

## Verifiche ripetibili

Eseguire `npm ci` e `npm run check` con Node.js 22. Il comando controlla le risorse, i WAV e le impronte SHA-256, esegue i test e compila l’app. `npm audit --omit=dev` verifica le vulnerabilità note delle dipendenze di produzione. L’esito positivo non comprende una prova di pronuncia degli audio, una revisione clinica né un’autorizzazione sui materiali.

La procedura automatica GitHub ripete questi controlli sui push e sulle richieste di modifica. Non è ancora stato verificato un suo avvio remoto.

## Prima dell’apertura pubblica

- [ ] Acquisire conferma dei diritti di pubblicazione del poster SIN 2025. La consegna del PDF come riferimento non documenta da sola l’autorizzazione alla ripubblicazione del PDF e della sua immagine.
- [ ] Documentare autore, licenza e autorizzazioni delle quattro foto in `src/assets/user-photos/`, comprese le eventuali liberatorie delle persone riconoscibili.
- [ ] Verificare la licenza applicabile alle icone e alle illustrazioni Icons8 già presenti. È presente l’attribuzione, ma non è una prova di licenza.
- [ ] Conservare provenienza e condizioni d’uso della voce sintetica e dei materiali generati, compreso il riferimento vocale. Nessuna prova automatica autorizza il riuso di una voce.
- [ ] Verificare nel progetto Vercel effettivo i log, la regione, i fornitori e subfornitori, le durate di conservazione, gli accordi privacy e le eventuali garanzie per trasferimenti internazionali. Allineare la pagina Privacy prima del rilascio. Non attivare analytics o altri servizi senza aggiornarla.
- [ ] Verificare il recapito pubblico e sottoporre note legali e informativa al controllo del gestore.
- [ ] Eseguire una prova completa su dispositivi reali: desktop, tablet e telefono; tastiera e lettore di schermo; audio consentito/bloccato; esportazione e stampa dei report.
- [ ] Pubblicare una preview della versione concordata; verificare gli header di sicurezza e le richieste di rete in produzione. Non considerare sufficiente l’avvio locale.
- [ ] Registrare URL, commit, data, verificatore ed esito del rilascio. Verificare che il deployment sia Ready e completare una prova sul sito pubblico.

## Pubblicazione e recupero

Vercel usa la radice del repository e pubblica `dist/`. Le intestazioni sono definite in `vercel.json`; si applicano sul deployment Vercel, non al server di sviluppo. Il routing hash conserva i collegamenti alle schermate. Non sono richieste chiavi API.

Prima di modificare il branch di produzione, conservare il riferimento dell’ultimo deployment funzionante. In caso di problemi, ripristinare quel deployment da Vercel e verificare nuovamente avvio, audio e report. Non cancellare dati locali dell’utente durante un recupero.

## Stato del rilascio

Verifiche locali del 20 novembre 2026: 80 test superati, compilazione riuscita, 23 audio verificati per presenza e impronta; audit delle dipendenze di produzione senza vulnerabilita note. Guida, privacy, indice delle sezioni, ritorno alla sessione e layout a 390 x 844 verificati nel browser. Protezioni Vercel configurate ma non ancora verificate su un deployment. L’apertura pubblica resta subordinata alle voci non concluse sopra. Le informazioni ricevute sul revisore non risolvono automaticamente le licenze dei materiali né la configurazione privacy dell’hosting.
