import { useMemo, useState } from "react";

function splitSemi(line) {
  // CSV Excel con ';' + possibili "\" e virgole decimali
  return line.split(";").map((x) => (x ?? "").trim());
}

function findTable(lines, anchorText, headerStartsWith) {
  // trova una tabella cercando una riga che contiene anchorText,
  // poi la prima riga che inizia con headerStartsWith (header),
  // poi prende righe finché la prima colonna non è vuota.
  const anchorIdx = lines.findIndex((l) => l.includes(anchorText));
  if (anchorIdx === -1) return null;

  let headerIdx = -1;
  for (let i = anchorIdx; i < Math.min(lines.length, anchorIdx + 80); i++) {
    const cols = splitSemi(lines[i]);
    if (cols[0] && cols[0].startsWith(headerStartsWith)) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return null;

  const header = splitSemi(lines[headerIdx]).filter((x) => x !== "");
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const colsRaw = splitSemi(lines[i]);
    // stop se riga vuota o separatore di sezione
    if (!colsRaw.join("").trim()) break;
    // se la prima colonna è vuota, spesso è separatore
    if (!colsRaw[0]) break;

    const cols = colsRaw.slice(0, header.length);
    const obj = {};
    header.forEach((h, idx) => (obj[h] = (cols[idx] ?? "").trim()));
    rows.push(obj);
  }
  return { header, rows };
}

export default function Home() {
  const [rawLines, setRawLines] = useState([]);
  const [selectedState, setSelectedState] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trimEnd());
    setRawLines(lines);
    setSelectedState(""); // reset
  };

  const parsed = useMemo(() => {
    if (!rawLines.length) return null;

    const topRegioni = findTable(
      rawLines,
      "🚨 TOP 10 REGIONI",
      "#"
    );

    const pipeline = findTable(
      rawLines,
      "🔄 PIPELINE STATI",
      "#"
    );

    const matrice = findTable(
      rawLines,
      "📊 MATRICE RESIDUI",
      "STATO"
    );

    return { topRegioni, pipeline, matrice };
  }, [rawLines]);

  const stati = useMemo(() => {
    if (!parsed?.pipeline?.rows?.length) return [];
    // colonna: "STATO AVANZAMENTO"
    return parsed.pipeline.rows
      .map((r) => r["STATO AVANZAMENTO"])
      .filter(Boolean);
  }, [parsed]);

  const tipologie = useMemo(() => {
    if (!parsed?.matrice?.header?.length) return [];
    // header matrice: "STATO \ TIPOLOGIA;FTTH;PCN;...;TOTALE"
    return parsed.matrice.header.filter(
      (h) =>
        h !== "STATO \\ TIPOLOGIA" &&
        h !== "STATO \\ TIPOLOGIA " &&
        h !== "STATO \\ TIPOLOGIA\t" &&
        h !== "TOTALE"
    );
  }, [parsed]);

  const matriceRow = useMemo(() => {
    if (!parsed?.matrice?.rows?.length) return null;
    const key = "STATO \\ TIPOLOGIA";
    const s = selectedState || stati[0] || "";
    const row =
      parsed.matrice.rows.find((r) => r[key] === s) ||
      parsed.matrice.rows.find((r) => (r[key] || "").toLowerCase() === (s || "").toLowerCase());
    return row ? { stato: s, row } : null;
  }, [parsed, selectedState, stati]);

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>📊 Dashboard Collaudi</h1>

      <div style={{ marginBottom: 18 }}>
        <input type="file" accept=".csv" onChange={handleFile} />
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          Carica il CSV “golive” esportato da Excel (con tutte le sezioni).
        </div>
      </div>

      {!parsed && (
        <div style={{ padding: 12, background: "#fff3cd", border: "1px solid #ffeeba" }}>
          Nessun file caricato.
        </div>
      )}

      {parsed && (
        <>
          {/* TOP REGIONI */}
          <h2>Top 10 Regioni (Residui)</h2>
          <div style={{ marginBottom: 20 }}>
            {(parsed.topRegioni?.rows || []).slice(0, 10).map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 6 }}>
                <div style={{ width: 22 }}>{r["#"]}</div>
                <div style={{ width: 160 }}>{r["REGIONE"]}</div>
                <div style={{ width: 80, fontWeight: 700 }}>{r["RESIDUI"]}</div>
                <div style={{ color: "#666" }}>{r["% TOT"]}</div>
              </div>
            ))}
          </div>

          {/* PIPELINE STATI */}
          <h2>Pipeline Stati</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {stati.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedState(s)}
                style={{
                  padding: "10px 12px",
                  border: "1px solid #ccc",
                  background: (selectedState || stati[0]) === s ? "#cce5ff" : "#f2f2f2",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* MATRICE */}
          <h2>Breakdown per Tipologia</h2>
          <div style={{ marginBottom: 8, fontSize: 14, color: "#444" }}>
            Stato selezionato: <b>{matriceRow?.stato || "-"}</b>
          </div>

          {matriceRow?.row ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {tipologie.map((t) => (
                <div
                  key={t}
                  style={{
                    border: "1px solid #ddd",
                    padding: 10,
                    minWidth: 120,
                    background: "#fafafa",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#666" }}>{t}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {matriceRow.row[t]}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 12, background: "#f8d7da", border: "1px solid #f5c6cb" }}>
              Non riesco a trovare la riga matrice per lo stato selezionato.
            </div>
          )}
        </>
      )}
    </div>
  );
}
