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

## 2026-08-03 — Kartenfilter ohne Wärme-Layer / Zahlen

- **Research:** Nutzer erwartet Zahlen an Messpunkten + transparenten Wärme-/Kälte-Layer dazwischen. Server-`/statistics/idw` liefert oft leere Features oder 422 (zu teuer).
- **Ideate:** Clientseitiges IDW-Grid aus hydrierten Stationen + Symbol-Labels.
- **Plan/Execute:** `heatGrid.ts`, `mapLayers.ts` (fill → circles → labels).
- **Review:** Bei Phänomenfilter muss Fläche + Zahlen sichtbar sein.

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

## Offen

- CORS der openSenseMap API ist für Browser-GET öffentlich; bei Änderungen Proxy über Netlify Functions prüfen.
- Sehr große BBox-Antworten können langsam sein — ggf. `phenomenon`-Filter serverseitig nachziehen.
- Netlify-Site manuell mit dem GitHub-Repo verbinden, sobald Netlify-Account freigeschaltet ist.
