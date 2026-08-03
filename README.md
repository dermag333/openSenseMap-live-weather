# openSenseMap Live

Modernes Redesign-Demo mit **Live-Wetterbericht** aus der öffentlichen [openSenseMap API](https://api.opensensemap.org).

Dies ist **kein** offizieller Ersatz für [opensensemap.org](https://opensensemap.org), sondern ein Prototyp unter [@dermag333](https://github.com/dermag333), der zeigt, wie Citizen-Science-Messungen als verständlicher Wetterbericht und Karten-UI wirken können.

## Features

- Ort per Geolocation oder Stadt-Suche
- Aggregation frischer senseBox-Messungen (Temperatur, Feuchte, Druck, PM, …)
- Regelbasierter Live-Wettertext inkl. Datenqualität
- MapLibre-Karte mit Stationen und Phänomenfilter
- Box-Detail mit Sensoren und 24h-Stichprobe

## Stack

- Vite + React + TypeScript
- MapLibre GL (CARTO Voyager Rastertiles)
- Netlify-ready (`netlify.toml`)

## Lokal starten

Voraussetzung: Node.js 22+

```bash
npm install
npm run dev
```

Optional API-URL überschreiben:

```bash
cp .env.example .env
```

## Build

```bash
npm run build
npm run preview
```

## Beitrag / Upstream

Offizielle Repos: [sensebox/openSenseMap](https://github.com/sensebox/openSenseMap), [sensebox/openSenseMap-API](https://github.com/sensebox/openSenseMap-API).

Bekannte Probleme: siehe [`errorandling.MD`](./errorandling.MD).

## Lizenz

Demo-Code: MIT. Daten unterliegen den Bedingungen der openSenseMap / senseBox Community.
