import { useMemo, useState, useEffect } from "react";

const DATA_URL =
  "https://raw.githubusercontent.com/mnotarstefano19-hub/dashboard-collaudi/refs/heads/main/latest_C%26D%20Avanzamento%20Regioni_AI%20test_golive_v2.csv";

function splitSemi(line) {
  return line.split(";").map((c) => (c ?? "").trim());
}

function toNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseSectionTable(lines, headerPredicate, stopPredicate) {
  const headerIdx = lines.findIndex((l) => headerPredicate((l ?? "").trim()));
  if (headerIdx === -1) return null;

  const header = splitSemi(lines[headerIdx]).filter((h) => h !== "");
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) break;
    if (stopPredicate(line)) break;

    const cellsRaw = splitSemi(line);
    const obj = {};

    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (cellsRaw[c] ?? "").trim();
    }

    rows.push(obj);
  }

  return { header, rows };
}

function Card({ title, children }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 16, marginBottom: 12 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [rawLines, setRawLines] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(DATA_URL);
      const text = await res.text();
      const lines = text.split("\n");
      setRawLines(lines);
    };

    load();
  }, []);

  const parsed = useMemo(() => {
    if (!rawLines.length) return null;

    const regioni = parseSectionTable(
      rawLines,
      (l) => l.startsWith("AREA;"),
      () => false
    );

    return { regioni };
  }, [rawLines]);

  if (!parsed) return <div>Caricamento...</div>;

  const regioni = parsed.regioni.rows.map((r) => ({
    regione: r["REGIONE"],
    totale: toNumber(r["TOTALE"]),
    row: r,
  }));

  const selected = regioni.find((r) => r.regione === selectedRegion);

  return (
  <div style={{ padding: 20 }}>
    <h1>📊 Dashboard Collaudi</h1>

    {/* KPI */}
    <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
      <div><b>Totale residui:</b> {regioni.reduce((s, r) => s + r.totale, 0)}</div>
      <div>
        <b>Regione più critica:</b>{" "}
        {regioni.slice().sort((a, b) => b.totale - a.totale)[0]?.regione}
      </div>
      <div>
        <b>Valore max regione:</b>{" "}
        {regioni.slice().sort((a, b) => b.totale - a.totale)[0]?.totale}
      </div>
    </div>
      <h1>Dashboard Collaudi</h1>

      <Card title="Regioni">
        {regioni.map((r) => (
          <div
            key={r.regione}
            onClick={() => setSelectedRegion(r.regione)}
            style={{ cursor: "pointer", marginBottom: 6 }}
          >
            {r.regione} — {r.totale}
          </div>
        ))}
      </Card>

      {selected && (
        <Card title={`Dettaglio ${selected.regione}`}>
          {Object.entries(selected.row)
            .filter(([k]) => !["AREA", "REGIONE", "TOTALE"].includes(k))
            .map(([k, v]) => (
              <div key={k}>
                {k}: {v}
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
