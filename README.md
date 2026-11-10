# TotalOffer — nuovo sito

Prototipo statico della nuova home di [totaloffer.com](https://www.totaloffer.com). Nessuna build: HTML, CSS e JS semplici.

## Anteprima locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000
```

## Struttura

- `index.html` — home a pagina unica: hero, servizi, come iniziamo, chi siamo, contatti
- `assets/css/style.css` — token di design (colori, tipografia, spazi) e stili; tema chiaro e scuro
- `assets/js/main.js` — menu mobile, servizi, modulo contatti
- `assets/js/scene.js` — scena 3D dell'hero (canvas, nessuna libreria esterna)
- `assets/fonts/` — Archivo e IBM Plex (licenza OFL), ospitati in locale

## Da completare prima della messa online

- Loghi dei partner al posto dei nomi in testo
- Modulo contatti: collegarlo a un endpoint reale (ora compone un'email)
- Pagine privacy e cookie policy
