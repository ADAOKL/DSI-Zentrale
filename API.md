# MiningVZ – Server-Anbindung (Koppel-Vertrag)

Das Spiel läuft **vollständig offline**. Diese Datei beschreibt, **wie** man später einen
Server ankoppelt – ohne den Spielcode zu ändern.

## Wie man online geht (2 Schritte)
1. `miningvz.eu/config.js` öffnen und setzen:
   ```js
   online: true,
   apiBase: "https://api.deine-domain.de",   // ohne abschließenden /
   features: { cloudSave: true, leaderboard: true, accounts: false }
   ```
2. Den Server bereitstellen, der die untenstehenden Endpunkte erfüllt. **Fertig.**

Die Spiel-Logik (`assets/mvapp.js`) spricht ausschließlich mit `assets/api.js` (`window.MVApi`).
Nur dort wird `fetch()` aufgerufen. Wird der Server gewechselt, ändert sich **nichts** im Spiel.

## Datenfluss
- **Lokal-first:** Der Spielstand wird IMMER sofort in `localStorage` gespeichert (kein Datenverlust bei Server-Ausfall).
- **Sync:** Im Online-Modus lädt das Spiel beim Start einmal vom Server (`pull`) und pusht danach alle `syncInterval` ms (`push`).

## Endpunkte (JSON, CORS erlaubt, Cookies/Session via `credentials: include`)

| Methode | Pfad | Zweck | Request | Response |
|---|---|---|---|---|
| GET  | `/api/state` | Cloud-Spielstand laden | – | `{ "state": {…}, "name": "Haimchen" }` oder `404` |
| POST | `/api/state` | Cloud-Spielstand sichern | `{ "state": {…}, "name": "…" }` | `200` |
| POST | `/api/login` | Konto-Login (optional) | `{ "name": "…", "pass": "…" }` | `{ "ok": true, "name": "…" }` |
| GET  | `/api/leaderboard` | Bestenliste (optional) | – | `[ { "name": "…", "ths": 0, "prestige": 0, "power": 0 } ]` |
| POST | `/api/score` | Score melden (optional) | `{ "ths": …, "prestige": …, "power": … }` | `200` |

`state` = das komplette Spielstand-Objekt `S` (gleiche Struktur wie der Export-Code, nur als JSON statt Base64).

---

## Beispiel-Stub A — PHP (cPanel-freundlich)
`api/state.php` (Spielstand pro Session in einer Datei – Minimalbeispiel):
```php
<?php
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
session_start();
$file = sys_get_temp_dir() . "/mvz_" . session_id() . ".json";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || !isset($body['state'])) { http_response_code(400); exit; }
    file_put_contents($file, json_encode($body));      // TODO: später echte DB statt Datei
    echo json_encode(["ok" => true]);
} else {
    if (!file_exists($file)) { http_response_code(404); exit; }
    echo file_get_contents($file);
}
```

## Beispiel-Stub B — Node.js / Express
```js
const express = require("express"), cors = require("cors");
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
const saves = {};                                       // TODO: echte DB

app.get("/api/state", (req, res) => {
  const s = saves[req.ip];
  if (!s) return res.sendStatus(404);
  res.json(s);
});
app.post("/api/state", (req, res) => {
  if (!req.body || !req.body.state) return res.sendStatus(400);
  saves[req.ip] = req.body;
  res.json({ ok: true });
});
app.listen(3000, () => console.log("MiningVZ API auf :3000"));
```

## Sicherheitshinweise (für den Echtbetrieb)
- **Validierung:** Server muss den eingehenden `state` prüfen (Größe begrenzen, Zahlen plausibilisieren) – ein Client kann manipuliert sein.
- **Auth:** Für echte Konten/Bestenlisten Session/Token nutzen (nicht `req.ip`).
- **Anti-Cheat:** Bestenlisten-Scores serverseitig gegen plausible Maxima prüfen.
- **HTTPS:** `apiBase` immer mit `https://`.
