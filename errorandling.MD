# Error handling log — openSenseMap Live

Probleme nach RIPER-5 dokumentieren (Research → Ideate → Plan → Execute → Review).

## 2026-08-03 — Vite 8 / Rolldown Binding fehlte

- **Research:** `npm run build` scheiterte an fehlendem `@rolldown/binding-darwin-arm64` (Vite 8).
- **Ideate:** Node upgraden und/oder auf Vite 5 pinne.
- **Plan:** Node 22 per nvm + Vite 5.4.11 / plugin-react 4.3.4 / TypeScript 5.7.3.
- **Execute:** Downgrade + `erasableSyntaxOnly` aus tsconfig entfernt.
- **Review:** Build muss mit `tsc -b && vite build` grün sein.

## 2026-08-03 — API-Ausreißer in Temperaturstatistiken

- **Research:** `/statistics/descriptive` lieferte Werte wie −37 °C / −141 °C.
- **Ideate:** Client-seitige Plausibilitätsgrenzen statt Blindvertrauen.
- **Plan:** In `phenomena.ts` Min/Max je Phänomen; Druck Pa→hPa normalisieren.
- **Execute:** Filter in `extractSamples`.
- **Review:** Bericht zeigt nur plausibilisierte Mediane; Ausreißer fließen nicht ein.

## 2026-08-03 — Wenig frische Outdoor-Boxen

- **Research:** Viele Boxen haben `exposure: unknown/indoor` oder veraltetes `lastMeasurementAt`.
- **Ideate:** Frische-Fenster + Radius erweitern + ehrliche Qualitätswarnung.
- **Plan:** `freshness.ts` + Auto-Expand in `buildWeather.ts`.
- **Execute:** Implementiert; UI zeigt `quality.warnings`.
- **Review:** Keine erfundenen Werte bei leerer Region.

## 2026-08-03 — Nominatim benötigt User-Agent

- **Research:** OSM Nominatim blockt anonyme Clients.
- **Ideate:** Fester identifizierbarer User-Agent.
- **Plan/Execute:** Header in `geocode.ts`.
- **Review:** Geocoding sollte mit gültigem UA funktionieren; bei 429 Rate-Limit in UI melden.

## 2026-08-03 — Blank page / keine Kartenlayer

- **Research:** Playwright: `Error: Style is not done loading.` — Map-Methoden vor Style-Load warfen und killten React (#root leer).
- **Ideate:** Alle Map-Ops hinter `map.isStyleLoaded()` + try/catch; Daten über `dataRef` nach `load` painten.
- **Plan/Execute:** SenseMap gehärtet; HTML-Marker + IDW-Fill bleiben.
- **Review:** Seite rendert wieder; Temperatur zeigt Fläche + Zahlen.

## 2026-08-03 — Kartenfilter ohne Wärme-Layer / Zahlen

- **Research:** Nutzer erwartet Zahlen an Messpunkten + transparenten Wärme-/Kälte-Layer. Symbol-Layer/Heatmap blieben unsichtbar; Server-IDW oft leer/422.
- **Ideate:** Client-IDW-Fill + HTML-Marker für Zahlen (ohne Glyph-Fonts).
- **Plan/Execute:** `heatGrid.ts`, `valueMarkers.ts`, pending sync nach `map.on('load')`.
- **Review:** Bei Temperatur müssen Fläche + °C-Labels sichtbar sein.

## 2026-08-03 — Live-Demo zeigte keine Temperaturwerte

- **Research:** Seite lud lange; danach „Kein frischer Temperaturwert“, obwohl frische Stationen gelistet waren. `GET /boxes` liefert `lastMeasurement` oft nur als ObjectId-String. `bbox`-Queries für Berlin dauerten ~30s (Timeout 20s).
- **Ideate:** Schnelle `near`/`maxDistance`-Suche + Hydrate per `GET /boxes/:id`; Ausreißer per IQR filtern.
- **Plan/Execute:** `hydrate.ts`, `buildWeather.ts` umgestellt, Timeout 45s, engere Plausibilitätsgrenzen, Suchfeld-Kontrast verbessert.
- **Review:** Report muss Mediane aus hydrierten Sensoren zeigen.

## 2026-08-03 — Netlify CLI ohne Login blockiert

- **Research:** `npx netlify-cli status` hing ohne Auth-Token / interaktives Login.
- **Ideate:** GitHub Pages als sofort öffentliche Demo + netlify.toml für späteren Connect.
- **Plan/Execute:** Pages-Workflow + `VITE_BASE` für Project-Pages; Netlify baut mit `VITE_BASE=/`.
- **Review:** Issue #485 verweist auf Pages-URL.

## 2026-08-03 — Wärme-Layer unsichtbar trotz „Wärmezellen“

- **Research:** HTML-Temperaturzahlen waren sichtbar; Legende/Stats meldeten 1296 Wärmezellen, aber die Fläche blieb optisch weiß. MapLibre GeoJSON-Fill + Heatmap auf Raster-Basemap malten keine wahrnehmbare Farbe (WebGL-Screenshot ohne preserveDrawingBuffer bestätigt keine bunten Pixel).
- **Ideate:** Statt Fill-Polygone ein clientseitiges IDW-Canvas → MapLibre `image`/`raster`-Layer mit echter Alpha-Farbe zwischen den Stationen.
- **Plan/Execute:** `heatRaster.ts` + `setHeatRaster` in `mapLayers.ts`; Fill/Heatmap entfernt; Marker-Rand farblich nach Wert.
- **Review:** Temperatur-Filter muss farbiges Wärmefeld + Zahlen an Messpunkten zeigen.

## 2026-08-03 — Eigene Station fehlt / Karte lädt beim Zoomen nicht nach

- **Research (RIPER-5):** Station `6a6f947115dace0007ab7210` (MAG_Wetterstation, outdoor, Nürnberg ~49.40/11.17) liefert live 45.87 °C in der API. Die Demo startet fest auf Berlin (`near` 10–18 km) — Station liegt ~380 km außerhalb. Zusätzlich verwarf der Temperaturfilter `max: 45` den Messwert. Karten-Pan/Zoom rief nie die API auf; Daten blieben an der Suche kleben.
- **Ideate:** Viewport-`near`-Fetch (nicht langsames `bbox`) + Temperatur-Max anheben + Fit nur bei neuer Suche.
- **Plan/Execute:** `fetchViewportBoxes.ts`, `onViewportIdle` in SenseMap, Home/Explore nachladen, `max` → 55 °C, Nürnberg-Shortcut in Explore.
- **Review:** Nach Pan zur eigenen Adresse / „Mein Standort“ / Suche Nürnberg muss MAG mit Zahl + Wärmefeld erscheinen.

## 2026-08-03 — Rauszoomen lud keine Flächen-Daten

- **Research:** Radius war auf 40 km gedeckelt; danach Race `loadAt` vs Viewport; danach waren gestreute Boxen in React-State, aber Marker blieben Berlin — `updateImage` ließ `isStyleLoaded()` kurz false werden, erneutes Paint wartete auf `load` (kommt nicht wieder). Zusätzlich zooms `selectedBoxId`-Effect bei jedem `boxes`-Update zurück zur Auswahl.
- **Ideate:** Radius ~220 km, Spread-Hydration, loadGen/viewportGen, Paint über Source/`idle`, Marker vor Heat, Select-Zoom nur bei ID-Wechsel.
- **Plan/Execute:** wie oben; Hydrate mit Retry/Concurrency 3.
- **Review:** Marker-Lon-Span nach Rauszoomen muss mehrere Grad betragen (nicht ~0.26° Berlin).

## Offen

- CORS der openSenseMap API ist für Browser-GET öffentlich; bei Änderungen Proxy über Netlify Functions prüfen.
- Sehr große BBox-Antworten können langsam sein — ggf. `phenomenon`-Filter serverseitig nachziehen.
- Netlify-Site manuell mit dem GitHub-Repo verbinden, sobald Netlify-Account freigeschaltet ist.
