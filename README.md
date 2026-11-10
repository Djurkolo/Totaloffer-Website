# TotalOffer — nuovo sito

Prototipo statico della nuova home di [totaloffer.com](https://www.totaloffer.com). Nessuna build: HTML, CSS e JS semplici.

## Anteprima locale

```bash
php -S localhost:8000      # con il modulo contatti funzionante
# oppure: python3 -m http.server 8000   (solo pagine statiche)
# poi apri http://localhost:8000
```

## Struttura

- `index.html` — home a pagina unica: hero, servizi, come iniziamo, chi siamo, contatti
- `assets/css/style.css` — token di design (colori, tipografia, spazi) e stili; tema chiaro e scuro
- `assets/js/main.js` — menu mobile, servizi, modulo contatti
- `assets/js/scene.js` — scena 3D dell'hero (canvas, nessuna libreria esterna)
- `invia.php` — riceve il modulo contatti, valida i dati e li spedisce a info@totaloffer.com
- `assets/fonts/` — Archivo e IBM Plex (licenza OFL), ospitati in locale

## Da completare prima della messa online

- Loghi dei partner al posto dei nomi in testo
- Modulo contatti: `invia.php` richiede un hosting con PHP e `mail()` attiva (su GitHub Pages non funziona); verificare che `noreply@totaloffer.com` sia un mittente accettato dal provider
- Pagine privacy e cookie policy
