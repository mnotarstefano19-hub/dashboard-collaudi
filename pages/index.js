import { useMemo, useState } from "react";

function splitSemi(line) {
  // Keep empty cells (important for trailing separators)
  return line.split(";").map((c) => (c ?? "").trim());
}

function toNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).trim();
  if (!s) return 0;
  // remove thousands dot, convert decimal comma
  const normalized = s.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseSectionTable(lines, headerPredicate, stopPredicate) {
  const headerIdx = lines.findIndex((l) => headerPredicate(l));
  if (headerIdx === -1) return null;

  const header = splitSemi(lines[headerIdx]).filter((h) => h !== "");
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = (lines[i] ?? "").trim();
    if (!line) break;
    if (stopPredicate(line)) break;

    const cellsRaw = splitSemi(line);
    // Map only up to header length
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = (cellsRaw[c] ?? "").trim();

    // Skip pure separator lines
    const nonEmpty = Object.values(obj).some((v) => String(v).trim() !== "");
    if (!nonEmpty) continue;

    rows.push(obj);
  }

  return { header, rows };
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: "#F2F4F7", fg: "#344054", bd: "#EAECF0" },
    blue: { bg: "#EEF4FF", fg: "#1D4ED8", bd: "#DDE7FF" },
    red: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FEE2E2" },
    green: { bg: "#ECFDF3", fg: "#027A48", bd: "#D1FADF" },
    amber: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Card({ title, right, children }) {
  return (
    <div
      style={{
        border: "1px solid #EAECF0",
        borderRadius: 14,
        background: "white",
        padding: 16,
        boxShadow: "0 1px 2px rgba(16,24,40,.06)",
      }}
    >
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800, color: "#101828" }}>{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

function Bar({ value, max, tone = "blue" }) {
  const colors = {
    blue: "#2563EB",
    red: "#DC2626",
    green: "#16A34A",
    amber: "#D97706",
    gray: "#98A2B3",
  };
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ height: 8, background: "#F2F4F7", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: 8, background: colors[tone] || colors.blue }} />
    </div>
  );
}

export default function DashboardCollaudiFinale() {
  const [rawLines, setRawLines] = useState([]);
  const [tab, setTab] = useState("pipeline");
  const [selectedState, setSelectedState] = useState("");
  const [areaFilter, setAreaFilter] = useState("TUTTE");

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const lines = text.replace(/\r/g, "").split("\n");
    setRawLines(lines);
    setSelectedState("");
    setAreaFilter("TUTTE");
    setTab("pipeline");
  };

  const parsed = useMemo(() => {
    if (!rawLines.length) return null;

    const pipeline = parseSectionTable(
      rawLines,
      (l) => l.startsWith("#;") && l.includes("STATO AVANZAMENTO") && l.includes("ITALIA"),
      (l) => l.startsWith("📊") || l.startsWith("📍")
    );

    const matrix = parseSectionTable(
      rawLines,
      (l) => l.startsWith("STATO") && l.includes("FTTH") && l.includes("TOTALE"),
      (l) => l.startsWith("📍")
    );

    const regioni = parseSectionTable(
      rawLines,
      (l) => l.startsWith("AREA;") && l.includes("REGIONE") && l.includes("TOTALE"),
      (l) => l.startsWith("🚨") || l.startsWith("🔄")
    );

    return { pipeline, matrix, regioni };
  }, [rawLines]);

  const pipelineRows = useMemo(() => {
    if (!parsed?.pipeline?.rows) return [];
    // Keep all states except totals row; keep zeros (user wants)
    return parsed.pipeline.rows.filter((r) => {
      const s = (r["STATO AVANZAMENTO"] || "").trim();
      if (!s) return false;
      return !/^TOTALE/i.test(s);
    });
  }, [parsed]);

  const stateOptions = useMemo(() => pipelineRows.map((r) => r["STATO AVANZAMENTO"]), [pipelineRows]);

  const selected = useMemo(() => {
    if (!stateOptions.length) return "";
    if (selectedState && stateOptions.includes(selectedState)) return selectedState;
    return stateOptions[0];
  }, [stateOptions, selectedState]);

  const matrixHeader = parsed?.matrix?.header || [];
  const matrixRows = parsed?.matrix?.rows || [];
  const statoKey = matrixHeader[0] || "STATO \\ TIPOLOGIA";

  const typologies = useMemo(() => {
    if (!matrixHeader.length) return [];
    return matrixHeader
      .slice(1)
      .filter((h) => h && h.toUpperCase() !== "TOTALE")
      .map((h) => h.replace(/\\_/g, "_"));
  }, [matrixHeader]);

  const matrixRowForSelected = useMemo(() => {
    if (!matrixRows.length) return null;
    const row =
      matrixRows.find((r) => (r[statoKey] || "").trim() === selected) ||
      matrixRows.find((r) => (r[statoKey] || "").trim().toLowerCase() === selected.toLowerCase());
    return row || null;
  }, [matrixRows, statoKey, selected]);

  const selectedTotal = useMemo(() => {
    if (!matrixRowForSelected) return 0;
    const t = matrixRowForSelected["TOTALE"] ?? matrixRowForSelected["TOTALE;"];
    return toNumber(t);
  }, [matrixRowForSelected]);

  const selectedTypologyValues = useMemo(() => {
    if (!matrixRowForSelected) return [];
    return typologies.map((t) => {
      const raw = matrixRowForSelected[t] ?? matrixRowForSelected[t.replace(/_/g, "\\_")];
      return { tipologia: t, value: toNumber(raw) };
    });
  }, [matrixRowForSelected, typologies]);

  const maxTypologyInSelected = useMemo(() => {
    if (!selectedTypologyValues.length) return { tipologia: "-", value: 0 };
    return selectedTypologyValues.reduce((best, cur) => (cur.value > best.value ? cur : best), selectedTypologyValues[0]);
  }, [selectedTypologyValues]);

  const pipelineStats = useMemo(() => {
    if (!pipelineRows.length) return null;
    const items = pipelineRows.map((r) => ({
      stato: r["STATO AVANZAMENTO"],
      italia: toNumber(r["ITALIA"]),
      pct: toNumber(r["% TOT"]),
      no: toNumber(r["NO"]),
      ne: toNumber(r["NE"]),
      ce: toNumber(r["CE"]),
      sud: toNumber(r["SUD"]),
    }));
    const totalResidui = items.reduce((s, x) => s + x.italia, 0);
    const bottleneck = items.reduce((best, cur) => (cur.italia > best.italia ? cur : best), items[0]);
    return { items, totalResidui, bottleneck };
  }, [pipelineRows]);

  const regioniRows = parsed?.regioni?.rows || [];

  const areas = useMemo(() => {
    const set = new Set();
    regioniRows.forEach((r) => {
      const a = (r["AREA"] || "").trim();
      if (a) set.add(a);
    });
    return ["TUTTE", ...Array.from(set)];
  }, [regioniRows]);

  const topRegioni = useMemo(() => {
    if (!regioniRows.length) return [];
    const rows = regioniRows
      .filter((r) => {
        const reg = (r["REGIONE"] || "").trim();
        if (!reg) return false;
        if (/TOTALE/i.test(reg)) return false;
        if (areaFilter !== "TUTTE" && (r["AREA"] || "").trim() !== areaFilter) return false;
        return true;
      })
      .map((r) => ({
        area: (r["AREA"] || "").trim(),
        regione: (r["REGIONE"] || "").trim(),
        totale: toNumber(r["TOTALE"]),
      }))
      .sort((a, b) => b.totale - a.totale);
    return rows.slice(0, 10);
  }, [regioniRows, areaFilter]);

  const areaTotals = useMemo(() => {
    const map = new Map();
    regioniRows.forEach((r) => {
      const area = (r["AREA"] || "").trim();
      const reg = (r["REGIONE"] || "").trim();
      if (!area || !reg || /TOTALE/i.test(reg)) return;
      const tot = toNumber(r["TOTALE"]);
      map.set(area, (map.get(area) || 0) + tot);
    });
    const arr = Array.from(map.entries()).map(([area, totale]) => ({ area, totale }));
    arr.sort((a, b) => b.totale - a.totale);
    return arr;
  }, [regioniRows]);

  const criticalArea = areaTotals[0] || { area: "-", totale: 0 };
  const criticalRegion = topRegioni[0] || { regione: "-", totale: 0, area: "-" };

  const actionCenter = useMemo(() => {
    if (!pipelineStats) return [];
    const a = [];
    const b = pipelineStats.bottleneck;
    a.push({
      tone: "red",
      title: "Bottleneck principale",
      text: `${b.stato} = ${b.italia} residui (${b.pct.toFixed(1)}% del totale)`
    });
    a.push({
      tone: "amber",
      title: "Area prioritaria",
      text: `${criticalArea.area} = ${criticalArea.totale} residui (concentrazione più alta)`
    });
    a.push({
      tone: "amber",
      title: "Regione da attaccare subito",
      text: `${criticalRegion.regione} (${criticalRegion.area}) = ${criticalRegion.totale} residui`
    });
    if (selectedTotal === 0) {
      a.push({
        tone: "green",
        title: "Stato selezionato senza carico",
        text: `${selected}: nessun residuo attuale. Se domani cambia, lo vedrai qui.`
      });
    } else {
      a.push({
        tone: "blue",
        title: "Driver nel dettaglio selezionato",
        text: `${maxTypologyInSelected.tipologia} pesa di più nello stato “${selected}” (${maxTypologyInSelected.value})`
      });
    }
    a.push({
      tone: "neutral",
      title: "Prossime azioni consigliate",
      text: `1) Sblocca “${pipelineStats.bottleneck.stato}”. 2) Focalizza ${criticalArea.area}. 3) Intervento mirato su ${criticalRegion.regione}.`
    });
    return a;
  }, [pipelineStats, selectedTotal, selected, maxTypologyInSelected, criticalArea, criticalRegion]);

  const content = (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#101828" }}>📊 Dashboard Collaudi</div>
          <div style={{ color: "#667085", marginTop: 4 }}>
            Strumento di monitoraggio e controllo — carica il CSV “golive” e ottieni priorità operative immediate.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="file" accept=".csv" onChange={handleFile} />
          <Badge tone={parsed ? "green" : "neutral"}>{parsed ? "File caricato" : "Carica CSV"}</Badge>
        </div>
      </div>

      {!parsed && (
        <div style={{ marginTop: 18 }}>
          <Card title="Come usarlo (semplice)">
            <ol style={{ margin: 0, paddingLeft: 18, color: "#344054" }}>
              <li>Esporta il tuo file “golive_v2.csv” (separatore ;).</li>
              <li>Caricalo qui sopra con “Scegli file”.</li>
              <li>Vai su Pipeline / Matrice / Regioni e usa l’Action Center per capire dove intervenire.</li>
            </ol>
          </Card>
        </div>
      )}

      {parsed && (
        <>
          {/* KPI */}
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Card
              title="Residui totali"
              right={<Badge tone="blue">Italia</Badge>}
            >
              <div style={{ fontSize: 28, fontWeight: 900 }}>{pipelineStats ? pipelineStats.totalResidui : "-"}</div>
              <div style={{ marginTop: 6, color: "#667085", fontSize: 12 }}>Somma dei residui per stato (esclusi totali).</div>
            </Card>
            <Card
              title="Bottleneck"
              right={<Badge tone="red">Priorità 1</Badge>}
            >
              <div style={{ fontSize: 16, fontWeight: 900 }}>{pipelineStats?.bottleneck?.stato || "-"}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>{pipelineStats?.bottleneck?.italia ?? "-"}</div>
              <div style={{ marginTop: 6, color: "#667085", fontSize: 12 }}>Massimo residuo tra gli stati.</div>
            </Card>
            <Card
              title="Area critica"
              right={<Badge tone="amber">Focus</Badge>}
            >
              <div style={{ fontSize: 16, fontWeight: 900 }}>{criticalArea.area}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>{criticalArea.totale}</div>
              <div style={{ marginTop: 6, color: "#667085", fontSize: 12 }}>Somma residui regioni per area.</div>
            </Card>
            <Card
              title="Regione critica"
              right={<Badge tone="amber">Top</Badge>}
            >
              <div style={{ fontSize: 16, fontWeight: 900 }}>{criticalRegion.regione}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900 }}>{criticalRegion.totale}</div>
              <div style={{ marginTop: 6, color: "#667085", fontSize: 12 }}>{criticalRegion.area}</div>
            </Card>
          </div>

          {/* Action Center */}
          <div style={{ marginTop: 12 }}>
            <Card title="Action Center (cosa fare adesso)">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {actionCenter.map((x, i) => (
                  <div key={i} style={{ border: "1px solid #EAECF0", borderRadius: 12, padding: 12, background: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ fontWeight: 900 }}>{x.title}</div>
                      <Badge tone={x.tone}>{x.tone.toUpperCase()}</Badge>
                    </div>
                    <div style={{ marginTop: 8, color: "#344054" }}>{x.text}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "pipeline", label: "Pipeline" },
              { id: "matrice", label: "Matrice" },
              { id: "regioni", label: "Regioni" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #D0D5DD",
                  cursor: "pointer",
                  background: tab === t.id ? "#EEF4FF" : "white",
                  fontWeight: 900,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Pipeline view */}
          {tab === "pipeline" && (
            <div style={{ marginTop: 12 }}>
              <Card
                title="Pipeline stati (clicca uno stato per vedere lo spaccato)"
                right={<Badge tone={selectedTotal === 0 ? "green" : "blue"}>Selezionato: {selected}</Badge>}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {pipelineStats?.items?.map((r) => {
                    const active = r.stato === selected;
                    const tone = r.italia === 0 ? "green" : r.stato === pipelineStats?.bottleneck?.stato ? "red" : "neutral";
                    return (
                      <div
                        key={r.stato}
                        onClick={() => {
                          setSelectedState(r.stato);
                          setTab("matrice");
                        }}
                        style={{
                          border: "1px solid #EAECF0",
                          borderRadius: 12,
                          padding: 12,
                          cursor: "pointer",
                          background: active ? "#F2F4F7" : "white",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 900 }}>{r.stato}</div>
                          <Badge tone={tone}>{r.italia}</Badge>
                        </div>
                        <div style={{ marginTop: 8, color: "#667085", fontSize: 12 }}>
                          NO {r.no} · NE {r.ne} · CE {r.ce} · SUD {r.sud}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Bar value={r.italia} max={pipelineStats.totalResidui} tone={tone === "red" ? "red" : "blue"} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Matrice view */}
          {tab === "matrice" && (
            <div style={{ marginTop: 12 }}>
              <Card
                title={`Matrice — breakdown tipologie per: ${selected}`}
                right={<Badge tone={selectedTotal === 0 ? "green" : "amber"}>Totale: {selectedTotal}</Badge>}
              >
                {selectedTotal === 0 ? (
                  <div style={{ padding: 12, borderRadius: 12, background: "#ECFDF3", border: "1px solid #D1FADF", color: "#027A48", fontWeight: 800 }}>
                    Nessun residuo in questo stato oggi. Se domani cambia, il sito lo mostrerà automaticamente.
                  </div>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                      {selectedTypologyValues
                        .slice()
                        .sort((a, b) => b.value - a.value)
                        .map((x) => (
                          <div key={x.tipologia} style={{ border: "1px solid #EAECF0", borderRadius: 12, padding: 12, background: "#fff" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontWeight: 900 }}>{x.tipologia}</div>
                              <Badge tone={x.value === maxTypologyInSelected.value ? "red" : "neutral"}>{x.value}</Badge>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Bar value={x.value} max={selectedTotal} tone={x.value === maxTypologyInSelected.value ? "red" : "blue"} />
                            </div>
                            <div style={{ marginTop: 8, color: "#667085", fontSize: 12 }}>
                              {selectedTotal > 0 ? `${((x.value / selectedTotal) * 100).toFixed(1)}% dello stato` : "0%"}
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* Regioni view */}
          {tab === "regioni" && (
            <div style={{ marginTop: 12 }}>
              <Card
                title="Regioni — top residui (filtrabile per area)"
                right={
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#667085", fontSize: 12 }}>Area:</span>
                    <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ padding: 8, borderRadius: 10, border: "1px solid #D0D5DD" }}>
                      {areas.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
                  {topRegioni.length === 0 && <div style={{ color: "#667085" }}>Nessun dato regioni trovato.</div>}
                  {topRegioni.map((r, idx) => (
                    <div key={r.regione} style={{ padding: "10px 0", borderBottom: "1px solid #F2F4F7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <Badge tone={idx === 0 ? "red" : "neutral"}>{idx + 1}</Badge>
                          <div style={{ fontWeight: 900 }}>{r.regione}</div>
                          <div style={{ color: "#667085", fontSize: 12 }}>{r.area}</div>
                        </div>
                        <div style={{ fontWeight: 900 }}>{r.totale}</div>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <Bar value={r.totale} max={topRegioni[0]?.totale || 1} tone={idx === 0 ? "red" : "amber"} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <div style={{ marginTop: 20, color: "#98A2B3", fontSize: 12 }}>
        Nota: gli stati a 0 restano visibili (utile per monitoraggio). I totali non vengono usati come stati ma come KPI.
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      {content}
    </div>
  );
}
