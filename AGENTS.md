# Procedura Bambino

- Per il layout e gli stili dei componenti usa le utility Tailwind direttamente nel markup, incluse le varianti responsive, di stato e di accessibilità.
- Non aggiungere classi CSS personalizzate, regole CSS locali o classi definite con `@apply` per lo styling dei componenti. Quando modifichi un componente, sostituisci le classi di stile superflue nell'area interessata con utility Tailwind.
- Definisci i colori della palette in src/styles/tokens.css usando sempre valori HEX. Nei componenti usa le utility Tailwind associate ai token della palette.
