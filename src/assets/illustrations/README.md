# Illustrazioni di Nido

27 immagini usate esclusivamente dall’app React. Il 16 novembre 2026 sono state sostituite 20 illustrazioni con le icone Icons8 iOS Outlined selezionate dall'utente nel catalogo `docs/design/alternative-icons8.html`. Le altre 7 restano originali: access, airway, compressions, dry, suction, team e ventilation.

Le 20 immagini sostituite sono contenitori SVG con PNG Icons8 incorporati a 256px: non sono disegni vettoriali. Mantengono il viewBox originale, non richiedono connessione e vengono incluse nella compilazione. Non alterare le proporzioni delle immagini incorporate. IDs e scelte approvate sono registrati nel file `icons8.json` alla radice del progetto. Le fotografie e le tavole anatomiche non sono state sostituite.

Fonte e attribuzione: [Icons8](https://icons8.com/). Il download SVG tramite MCP non è incluso nel piano collegato; sono stati scaricati i PNG disponibili. Non è stata verificata una licenza commerciale del progetto. Un collegamento di attribuzione è presente nel pannello Protocollo e fonti.

Per sostituire un disegno, modifica il relativo `.svg` mantenendo il nome e il `viewBox="0 0 240 180"`. Le immagini vengono importate anche nella compilazione di produzione. Le associazioni sono in `../../Illustration.tsx`: `stepArt` per gli step e `artFor` per i singoli testi.

- Preparazione: `team`, `pregnancy`, `checklist`.
- Nascita e primi interventi: `birth`, `cord`, `assessment`, `skin`, `warmth`, `dry`, `tone`, `position`, `suction`, `mouth`.
- Respiro e monitoraggio: `breathing`, `distress`, `oxygen`, `ventilation`, `mask`, `heart`, `saturation`.
- Supporto avanzato e rivalutazione: `compressions`, `medication`, `access`, `airway`, `lungs`, `stomach`, `care`.

Le immagini sono schematiche e servono a riconoscere l'argomento, non a illustrare una tecnica esecutiva. Il testo rimane il riferimento; le immagini ripetono visivamente il contenuto e sono escluse dalla lettura degli screen reader.
