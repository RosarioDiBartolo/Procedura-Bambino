# Nido — simulazione NLS

Versione React con guida vocale da file preregistrati, senza AI, chat, microfono o server API.

## Avvio e verifica

Richiede Node.js 22.18 o successivo. Dalla cartella principale:

```sh
npm ci
npm run dev
npm run build
npm test
```

Aprire http://localhost:5180. La compilazione produce `prototipo-02/dist`.

## Versioni

- `main`: versione senza AI destinata alla pubblicazione.
- `codex/ai-preserved`: versione AI completa conservata prima della rimozione.
- `codex/prerecorded-voice`: sviluppo della guida preregistrata.

## Voce

La voce è attiva per impostazione predefinita, salvo disattivazione salvata sul dispositivo. Attiva voce avvia il file dello step corrente. Ascolta / Ripeti ricomincia dall'inizio; Interrompi ferma la lettura. Disattiva voce interrompe e impedisce l'avvio automatico agli step successivi. Dopo l'attivazione, ogni cambio di step arresta immediatamente il vecchio audio e avvia il nuovo dopo 500 ms. Interrompere o disattivare durante questa pausa annulla anche la riproduzione in attesa; Ascolta / Ripeti resta immediato. La preferenza viene salvata sul dispositivo; a ogni ingresso o ricarica viene tentata la lettura automatica dopo 500 ms. Se il browser blocca la riproduzione automatica, un messaggio visibile invita a premere Ascolta.

Si usano esclusivamente i WAV esistenti in `shared/assets/audio/qwen`. Non vengono generati o inviati audio a servizi esterni. Alcune registrazioni descrivono i vecchi controlli: nascita, valutazione iniziale, respiro, difficoltà respiratoria, FC dopo ventilazione/correttivi/compressioni e conclusione. I testi sostitutivi non ancora registrati sono in `prototipo-02/audio/Testi-audio-nuove-schermate.md`. L'interfaccia attuale resta il riferimento per i comandi.

## Deploy Vercel

Importare questo repository con Root Directory impostata alla radice del repository, non a `prototipo-02`. `vercel.json` configura installazione, compilazione e cartella di output. Branch produzione: `main`. Nessuna variabile d'ambiente o chiave API necessaria. Il routing hash non richiede riscritture.

Prototipo per simulazione con dati fittizi, non validato per uso assistenziale. Registro e sessione restano nel browser; nessuna sincronizzazione tra dispositivi. Fonti originali in `fonti/`, interfaccia e asset comuni in `shared/`.
