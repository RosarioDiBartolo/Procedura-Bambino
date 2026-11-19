# Fonti delle immagini — prototipo 02

Ricerca e verifica: 15 novembre 2026. Questi file appartengono esclusivamente al prototipo 02 e vengono inclusi nella compilazione, senza richieste a siti esterni durante l'uso.

| File | Autore | Fonte | Licenza | Modifiche |
| --- | --- | --- | --- | --- |
| simulation.jpg | SylviaGollnerMedUniGraz | https://commons.wikimedia.org/wiki/File:MedUniGraz_CSC.jpg | CC BY-SA 4.0 | Nessuna; ridimensionamento di visualizzazione |
| airway.png | BruceBlaus | https://commons.wikimedia.org/wiki/File:CPR_Infant_Closed_vs_Open_Airway.png | CC BY-SA 4.0 | Nessuna; etichette inglesi originali |
| skin.jpg | DerringUndo | https://commons.wikimedia.org/wiki/File:Newborn_on_mother_chest.jpg | CC BY-SA 4.0 | Nessuna; ridimensionamento di visualizzazione |

Licenza: https://creativecommons.org/licenses/by-sa/4.0/
Attribuzione, fonte e licenza sono visibili anche sotto le immagini e nella finestra di ingrandimento. Gli autori non sono presentati come sostenitori del progetto.

## Scelta editoriale e limiti

La foto di Graz mostra una simulazione su manichino con ventilazione e compressioni; non sostituisce una tavola della tecnica né dimostra tutti i dispositivi del percorso. La tavola di BruceBlaus confronta la pervietà anatomica nel lattante: non è una dimostrazione della posizione neonatale da eseguire. La foto skin to skin mostra il contatto, non l'intera sorveglianza del neonato.

Per gli altri passaggi restano SVG originali, ingranditi e affiancati da didascalie basate sui contenuti già presenti in flow.ts. Non è stata trovata e verificata una serie esterna completa per tutti i 18 step.

Altre fonti esaminate:
- Unsplash: ricerca iniziale di foto skin to skin; il 18 novembre è stata aggiunta la foto del supporto respiratorio documentata sotto.
- MSF: https://medicalguidelines.msf.org/en/viewport/ONC/english/10-2-neonatal-resuscitation-51418320.html — figure pertinenti per posizione, maschera e ventilazione, non importate. Condizioni per strumenti/app: https://medicalguidelines.msf.org/en/node/1338.
- Wikimedia, compressioni: https://commons.wikimedia.org/wiki/Category:Neonatal_chest_compressions.

Per sostituire le immagini principali e le spiegazioni: ../../ProcedureVisual.tsx. Per gli SVG e le icone dei singoli interventi: ../../Illustration.tsx. Le decisioni e le soglie del percorso non sono state modificate.

## Supporto respiratorio — 18 novembre 2026

- File: `respiratory-support-unsplash.jpg`.
- Foto: https://unsplash.com/photos/baby-lying-in-incubator-74-7j5t4sG0
- Immagine: https://images.unsplash.com/photo-1560306580-9e204fe45f3e
- Licenza: Unsplash License, indicata dalla pagina come gratuita: https://unsplash.com/license
- Descrizione della fonte: neonato prematuro in incubatrice con ossigeno. È una foto di contesto, non una dimostrazione della tecnica CPAP.
- Copia locale ridimensionata; ritaglio di visualizzazione tramite object-fit. La didascalia rimanda alla pagina originale.

## Aggiornamento � 19 novembre 2026
- `medication-unsplash.jpg`: https://unsplash.com/photos/person-drawing-liquid-into-syringe-cM1aU42FnRg � Unsplash License (gratuita, verificata sulla pagina). Immagine: https://images.unsplash.com/photo-1611694449252-02453c27856a. Copia locale ridimensionata. Foto di preparazione da flaconcino, non illustrazione di adrenalina, dose o via neonatale.
- Il caso positivo dello step `distress` usa anche `respiratory-support-unsplash.jpg`, documentata sopra, come foto di contesto.
