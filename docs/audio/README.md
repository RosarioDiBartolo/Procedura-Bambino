# Generare i nuovi audio

1. Apri [Google Colab](https://colab.research.google.com/) e carica `Genera-audio-NLS-Qwen-Colab.ipynb` da **File → Carica notebook**. Il notebook contiene già tutti i 23 testi aggiornati.
2. Seleziona **Runtime → Cambia tipo di runtime → GPU**.
3. Esegui in ordine le sezioni 1, 2 e 3: installazione, configurazione e generazione dei due campioni vocali.
4. Ascolta i campioni. Nella sezione 4 scegli `SELECTED_CANDIDATE = 1` oppure `2` e imposta `REFERENCE_CHECKED = True` dopo aver verificato il campione.
5. Esegui le sezioni dalla 4 alla 8. Al termine scarica `nls-qwen-completo.zip` prima di chiudere Colab. Se la generazione segnala errori, correggili e riesegui la sezione 7 prima del download.
6. Ascolta i nuovi audio, controllando parole, numeri e pronunce. Estrai i 23 WAV e `manifest.json` in `public/audio/qwen`, sostituendo i file omonimi. Conserva lo ZIP completo: contiene anche il riferimento vocale.

L'app riproduce direttamente i WAV: modificare i testi o il manifest non modifica le registrazioni. Il notebook genera nuovi campioni vocali; la stessa descrizione non garantisce una voce identica a quella delle registrazioni precedenti.

Se la memoria GPU non basta, nella configurazione cambia `BASE_MODEL` in `Qwen/Qwen3-TTS-12Hz-0.6B-Base`, riesegui la selezione della voce e riparti dal caricamento del modello Base. Disponibilità GPU e limiti dipendono da Colab. Il notebook è stato verificato nella sintassi, ma non eseguito su Colab in questa sessione.

## File mantenuti

- `scripts-it.json`: fonte dei 23 testi da modificare.
- `build-qwen-notebook.py`: ricrea il notebook dopo le modifiche ai testi; dalla cartella principale del progetto esegui `python docs/audio/build-qwen-notebook.py`.
- `Genera-audio-NLS-Qwen-Colab.ipynb`: notebook autonomo da caricare su Colab.
- `README.md`: queste istruzioni.
