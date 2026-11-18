# Base condivisa dei prototipi

- `assets/brand/`: unica copia sorgente del logo e della favicon.
- `assets/sources/`: immagini di riferimento derivate dai documenti.
- `assets/previews/`: anteprime contrassegnate dalla versione rappresentata.
- `assets/manifest.json`: inventario dei percorsi condivisi.
- `design-system/tokens.css`: colori semantici, caratteri, raggi e spaziatura. Il tema di base è quello della postazione React; `data-theme="nido"` conserva la variante precedente, senza duplicare il sistema in ciascun prototipo.
- `design-system/tailwind.css`: utility basate sui token e scansione dei componenti esterni.
- `ui/src/components/`: unica implementazione dei dieci componenti React shadcn.
- `ui/src/lib/utils.ts`: utility comuni.
- Gli stili dei componenti React sono definiti direttamente nei rispettivi `className` Tailwind. I file CSS condivisi contengono soltanto token e configurazione del tema; l'app mantiene separati soltanto keyframe e comportamento globale indispensabile.

Layout e composizione rimangono specifici dei prototipi. La base comune non contiene regole cliniche, flussi decisionali o stato delle sessioni.

## Aggiunte future

I componenti riutilizzabili vanno in `shared/ui`; non ricreare copie locali identiche in `components/ui`. Gli alias shadcn nei `components.json` indirizzano alla libreria comune e hanno style, baseColor e iconLibrary allineati. Avviare il generatore dalla cartella dell'app React e verificare che i file prodotti vadano nel workspace comune.

I nuovi asset vanno in `shared/assets`, aggiornando l'inventario. Il logo è disponibile per tutte le versioni senza imporre lo stesso nome o intestazione a ogni variante.

Le dipendenze sono gestite dai workspace npm e dal lockfile principale. Eseguire `npm install` dalla radice.

## Fonti e distribuzione

I PDF originali restano in `fonti/`. Vite serve direttamente il poster da lì in sviluppo e lo emette nel bundle di produzione. `publicDir` usa gli asset comuni. Le copie in `dist/` sono risultati di compilazione, non fonti da modificare.

Il prototipo HTML usa percorsi relativi verso `shared`; quello React pubblica gli asset alla radice dell'app, ad esempio `/brand/favicon.svg` e `/sources/poster.png`. Non condividiamo registri o dati degli scenari.

Il server di sviluppo rende consultabile anche la versione HTML all'indirizzo `/prototipo-01/prototipo/index.html`, limitando i file condivisi serviti alle cartelle degli asset, degli stili e delle fonti. Non è necessario un secondo server per confrontare i prototipi.

`npm test` verifica entrambe le versioni e i riferimenti comuni; `npm run build` verifica il bundle con i componenti condivisi e le loro classi Tailwind.

Configurazione di riferimento: https://ui.shadcn.com/docs/monorepo
