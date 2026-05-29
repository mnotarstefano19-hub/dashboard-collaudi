import { useEffect, useMemo, useState } from "react";

const DATA_URL =
  "https://raw.githubusercontent.com/mnotarstefano19-hub/dashboard-collaudi/refs/heads/main/latest_C%26D%20Avanzamento%20Regioni_AI%20test_golive_v2.csv";

const SCOPE_OPTIONS = ["ITALIA", "NORD OVEST", "NORD EST", "CENTRO", "SUD"];

function splitSemi(line) {
  return (line || "").split(";").map((c) => (c ?? "").trim());
}

function toNumber(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).trim();
  if (!s) return 0;
  const normalized = s.replace(/\./g, "").replace(/,/g, ".").replace(/%/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function parseSectionTable(lines, headerPredicate, stopPredicate) {
  const headerIdx = lines.findIndex((l) => headerPredicate((l || "").trim()));
  if (headerIdx === -1) return null;

  const header = splitSemi(lines[headerIdx]).filter((h) => h !== "");
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = (lines[i] || "").trim();
    if (!line) break;
    if (stopPredicate(line)) break;

    const cells = splitSemi(line);
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = (cells[c] ?? "").trim();
    }

    const hasAnyValue = Object.values(obj).some((v) => String(v).trim() !== "");
    if (!hasAnyValue) continue;
    rows.push(obj);
  }

  return { header, rows };
}

function Card({ title, right, children, style = {} }) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 16,
        padding: 16,
        background: "white",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>{title}</h3>
          {right || null}
        </div>
      )}
      {children}
    </div>
  );
}

function StatCard({ label, value, subtitle }) {
  return (
    <Card style={{ minWidth: 220 }}>
      <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {subtitle ? (
        <div style={{ marginTop: 8, fontSize: 13, color: "#6B7280" }}>{subtitle}</div>
      ) : null}
    </Card>
  );
}

function Badge({ children, bg = "#EEF2FF", color = "#3730A3" }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function ProgressBar({ value, max, color = "#2563EB" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ height: 8, background: "#E5E7EB", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color }} />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #D1D5DB",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        borderRadius: 10,
        padding: "10px 14px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ScopeButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? "2px solid #111827" : "1px solid #D1D5DB",
        background: active ? "#111827" : "white",
        color: active ? "white" : "#111827",
        borderRadius: 999,
        padding: "8px 14px",
        fontWeight: 800,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

function EmptyInfo({ text }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: "#ECFDF3",
        border: "1px solid #D1FADF",
        color: "#027A48",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
      <div style={{ color: "#6B7280" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}

export default function DashboardCollaudi() {
  const [rawLines, setRawLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [tab, setTab] = useState("pipeline");
  const [scope, setScope] = useState("ITALIA");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [areaFilter, setAreaFilter] = useState("TUTTE");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        setRawLines(text.replace(/\r/g, "").split("\n"));
      } catch (err) {
        console.error(err);
        setErrorMsg(
          "Errore nel caricamento del CSV remoto. Verifica che il file esista su GitHub e che il link RAW sia corretto."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setSelectedRegion(null);
  }, [areaFilter]);

  useEffect(() => {
    setSelectedState(null);
  }, [scope]);

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
      (_) => false
    );

    return { pipeline, matrix, regioni };
  }, [rawLines]);

  const pipelineRows = useMemo(() => {
    if (!parsed?.pipeline?.rows) return [];
    return parsed.pipeline.rows
      .filter((r) => {
        const s = (r["STATO AVANZAMENTO"] || "").trim();
        return s && !/^TOTALE/i.test(s);
      })
      .map((r) => ({
        stato: r["STATO AVANZAMENTO"],
        totale: toNumber(r["ITALIA"]),
        pct: toNumber(r["% TOT"]),
        no: toNumber(r["NO"]),
        ne: toNumber(r["NE"]),
        ce: toNumber(r["CE"]),
        sud: toNumber(r["SUD"]),
      }));
  }, [parsed]);

  const matrixHeader = parsed?.matrix?.header || [];
  const matrixRows = parsed?.matrix?.rows || [];
  const matrixStateKey = matrixHeader[0] || "STATO \\ TIPOLOGIA";

  const typologies = useMemo(() => {
    if (!matrixHeader.length) return [];
    return matrixHeader
      .slice(1)
      .filter((h) => h && h.toUpperCase() !== "TOTALE")
      .map((h) => h.replace(/\\_/g, "_"));
  }, [matrixHeader]);

  const regionRows = useMemo(() => {
    if (!parsed?.regioni?.rows) return [];
    return parsed.regioni.rows
      .map((r) => ({
        area: (r["AREA"] || "").trim(),
        regione: (r["REGIONE"] || "").trim(),
        totale: toNumber(r["TOTALE"]),
        row: r,
      }))
      .filter((r) => r.area && r.regione && !/^TOTALE/i.test(r.regione));
  }, [parsed]);

  const areas = useMemo(() => {
    return ["TUTTE", ...Array.from(new Set(regionRows.map((r) => r.area)))];
  }, [regionRows]);

  const filteredRegions = useMemo(() => {
    return regionRows
      .filter((r) => areaFilter === "TUTTE" || r.area === areaFilter)
      .sort((a, b) => b.totale - a.totale);
  }, [regionRows, areaFilter]);

  const selected = filteredRegions.find((r) => r.regione === selectedRegion) || null;

  // ===== FILTRO TERRITORIALE SOLO SEZIONE ALTA =====
  const scopeStateRows = useMemo(() => {
    return pipelineRows
      .map((r) => {
        const scopedValue =
          scope === "ITALIA"
            ? r.totale
            : scope === "NORD OVEST"
            ? r.no
            : scope === "NORD EST"
            ? r.ne
            : scope === "CENTRO"
            ? r.ce
            : r.sud;

        return {
          ...r,
          scopedValue,
        };
      })
      .sort((a, b) => b.scopedValue - a.scopedValue);
  }, [pipelineRows, scope]);

  const scopeRegionRows = useMemo(() => {
    return (scope === "ITALIA" ? regionRows : regionRows.filter((r) => r.area === scope)).sort(
      (a, b) => b.totale - a.totale
    );
  }, [regionRows, scope]);

  const scopeTotalResidui = useMemo(() => {
    return scope === "ITALIA"
      ? pipelineRows.reduce((s, r) => s + r.totale, 0)
      : scopeRegionRows.reduce((s, r) => s + r.totale, 0);
  }, [scope, pipelineRows, scopeRegionRows]);

  const mostCriticalState = scopeStateRows[0] || null;
  const mostCriticalRegion = scopeRegionRows[0] || null;

  const mostCriticalArea = useMemo(() => {
    const areaTotals = [
      {
        area: "NORD OVEST",
        value: regionRows.filter((r) => r.area === "NORD OVEST").reduce((s, r) => s + r.totale, 0),
      },
      {
        area: "NORD EST",
        value: regionRows.filter((r) => r.area === "NORD EST").reduce((s, r) => s + r.totale, 0),
      },
      {
        area: "CENTRO",
        value: regionRows.filter((r) => r.area === "CENTRO").reduce((s, r) => s + r.totale, 0),
      },
      {
        area: "SUD",
        value: regionRows.filter((r) => r.area === "SUD").reduce((s, r) => s + r.totale, 0),
      },
    ].sort((a, b) => b.value - a.value);

    if (scope === "ITALIA") return areaTotals[0] || { area: "-", value: 0 };
    return { area: scope, value: scopeRegionRows.reduce((s, r) => s + r.totale, 0) };
  }, [scope, regionRows, scopeRegionRows]);

  // ===== DETTAGLIO STATO =====
  const effectiveState = selectedState || mostCriticalState?.stato || pipelineRows[0]?.stato || null;

  const selectedStateRow = useMemo(() => {
    if (!effectiveState || !matrixRows.length) return null;
    return (
      matrixRows.find(
        (r) =>
          ((r[matrixStateKey] || "").trim() === effectiveState) ||
          ((r[matrixStateKey] || "").trim().toLowerCase() === effectiveState.toLowerCase())
      ) || null
    );
  }, [effectiveState, matrixRows, matrixStateKey]);

  const selectedStateValues = useMemo(() => {
    if (!selectedStateRow) return [];
    return typologies
      .map((t) => ({
        tipologia: t,
        value: toNumber(selectedStateRow[t] ?? selectedStateRow[t.replace(/_/g, "\\_")]),
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedStateRow, typologies]);

  const stateDriver = selectedStateValues[0] || { tipologia: "-", value: 0 };

  // ===== DETTAGLIO REGIONE =====
  const selectedRegionValues = useMemo(() => {
    if (!selected) return [];
    return Object.entries(selected.row)
      .filter(([k]) => !["AREA", "REGIONE", "TOTALE"].includes(k))
      .map(([k, v]) => ({ tipologia: k.replace(/\\_/g, "_"), value: Number(v) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [selected]);

  const selectedRegionDriver = selectedRegionValues[0] || { tipologia: "-", value: 0 };

  const dominantAreaInState = useMemo(() => {
    if (!pipelineRows.length || !effectiveState) return { area: "-", value: 0 };
    const row = pipelineRows.find((r) => r.stato === effectiveState);
    if (!row) return { area: "-", value: 0 };
    const entries = [
      ["NORD OVEST", row.no],
      ["NORD EST", row.ne],
      ["CENTRO", row.ce],
      ["SUD", row.sud],
    ].sort((a, b) => b[1] - a[1]);
    return { area: entries[0][0], value: entries[0][1] };
  }, [pipelineRows, effectiveState]);

  const actionCenter = useMemo(() => {
    const actions = [];
    if (mostCriticalState) {
      const totalBase = Math.max(scopeTotalResidui, 1);
      actions.push({
        icon: "⚠️",
        title: scope === "ITALIA" ? "Bottleneck principale" : `Bottleneck principale (${scope})`,
        text: `${mostCriticalState.stato} con ${mostCriticalState.scopedValue} residui (${((mostCriticalState.scopedValue / totalBase) * 100).toFixed(1)}%)`,
      });
    }
    if (mostCriticalRegion) {
      actions.push({
        icon: "🔥",
        title: scope === "ITALIA" ? "Regione da attaccare subito" : `Regione critica in ${scope}`,
        text: `${mostCriticalRegion.regione} con ${mostCriticalRegion.totale} residui`,
      });
    }
    actions.push({
      icon: "🗺️",
      title: scope === "ITALIA" ? "Area più critica" : "Perimetro selezionato",
      text: `${mostCriticalArea.area} con ${mostCriticalArea.value} residui`,
    });
    if (selected) {
      actions.push({
        icon: "📍",
        title: "Regione selezionata",
        text:
          selected.totale === 0
            ? `${selected.regione}: nessun residuo attuale`
            : `${selected.regione}: driver ${selectedRegionDriver.tipologia} (${selectedRegionDriver.value})`,
      });
    }
    if (selectedStateRow) {
      actions.push({
        icon: "🧭",
        title: "Fase selezionata",
        text:
          stateDriver.value === 0
            ? `${effectiveState}: nessun elemento residuo`
            : `${effectiveState}: driver ${stateDriver.tipologia} (${stateDriver.value})`,
      });
      actions.push({
        icon: "🧱",
        title: "Dove pesa lo stato",
        text: `${effectiveState}: concentrazione maggiore in ${dominantAreaInState.area} (${dominantAreaInState.value})`,
      });
    }
    return actions;
  }, [
    mostCriticalState,
    mostCriticalRegion,
    mostCriticalArea,
    selected,
    selectedRegionDriver,
    selectedStateRow,
    stateDriver,
    effectiveState,
    dominantAreaInState,
    scope,
    scopeTotalResidui,
  ]);

  if (loading) {
    return <div style={{ padding: 20 }}>Caricamento dati...</div>;
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 20, color: "crimson", fontWeight: 700 }}>
        {errorMsg}
      </div>
    );
  }

  if (!parsed) {
    return <div style={{ padding: 20 }}>Nessun dato disponibile.</div>;
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 42 }}>📊 Dashboard Collaudi</h1>
            <div style={{ marginTop: 6, color: "#6B7280" }}>
              Monitoraggio e controllo — aggiornamento automatico dal CSV remoto
            </div>
          </div>
          <div>
            <button
              onClick={() => window.location.reload()}
              style={{
                border: "1px solid #D1D5DB",
                background: "white",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔄 Ricarica dati
            </button>
          </div>
        </div>

        {/* VISTA FILTRABILE ALTA */}
        <Card
          title="Vista filtrabile"
          right={<Badge bg="#ECFDF3" color="#027A48">Ambito: {scope}</Badge>}
          style={{ marginBottom: 20 }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {SCOPE_OPTIONS.map((s) => (
              <ScopeButton key={s} active={scope === s} onClick={() => setScope(s)}>
                {s}
              </ScopeButton>
            ))}
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 20 }}>
          <StatCard
            label={scope === "ITALIA" ? "Totale residui" : `Residui ${scope}`}
            value={scopeTotalResidui}
            subtitle={scope === "ITALIA" ? "Somma dei residui nazionali" : "Somma dei residui del territorio selezionato"}
          />
          <StatCard
            label="Stato più critico"
            value={mostCriticalState?.stato || "-"}
            subtitle={
              mostCriticalState?.scopedValue !== undefined
                ? `${mostCriticalState.scopedValue} residui`
                : ""
            }
          />
          <StatCard
            label="Regione più critica"
            value={mostCriticalRegion?.regione || "-"}
            subtitle={mostCriticalRegion ? `${mostCriticalRegion.totale} residui` : ""}
          />
          <StatCard
            label={scope === "ITALIA" ? "Area più critica" : "Perimetro selezionato"}
            value={mostCriticalArea?.area || "-"}
            subtitle={mostCriticalArea ? `${mostCriticalArea.value} residui` : ""}
          />
        </div>

        <Card title="🎯 Action Center" style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {actionCenter.map((a, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {a.icon} {a.title}
                </div>
                <div>{a.text}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* SEZIONE BASSA INVARIATA NELLA LOGICA */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <TabButton active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
            Pipeline Stati
          </TabButton>
          <TabButton active={tab === "regioni"} onClick={() => setTab("regioni")}>
            Regioni
          </TabButton>
        </div>

        {tab === "pipeline" && (
          <Card title="Pipeline Stati">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
              {pipelineRows.map((r) => {
                const active = effectiveState === r.stato;
                return (
                  <div
                    key={r.stato}
                    onClick={() => setSelectedState(r.stato)}
                    style={{
                      border: active ? "2px solid #111827" : "1px solid #E5E7EB",
                      borderRadius: 12,
                      padding: 14,
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ fontWeight: 800 }}>{r.stato}</div>
                      <Badge>{r.totale}</Badge>
                    </div>
                    <div style={{ marginTop: 8, color: "#9CA3AF", fontSize: 12 }}>
                      {r.pct.toFixed(1)}% del totale
                    </div>
                    <div style={{ marginTop: 4, color: "#D1D5DB", fontSize: 11 }}>
                      NO {r.no} • NE {r.ne} • CE {r.ce} • SUD {r.sud}
                    </div>
                    <ProgressBar value={r.totale} max={totalResidui} color={active ? "#111827" : "#2563EB"} />
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
              <Card title={`Dettaglio stato: ${effectiveState}`}>
                {selectedStateValues.length === 0 || selectedStateValues.every((x) => x.value === 0) ? (
                  <EmptyInfo text={`Nessun residuo nello stato “${effectiveState}” al momento.`} />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                    {selectedStateValues.map((x, idx) => {
                      const pct =
                        selectedStateRow && toNumber(selectedStateRow["TOTALE"]) > 0
                          ? ((x.value / toNumber(selectedStateRow["TOTALE"])) * 100).toFixed(1)
                          : "0.0";

                      return (
                        <div key={x.tipologia} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>{x.tipologia}</div>
                            <div>{idx === 0 ? "🔥" : ""}</div>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>{x.value}</div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>{pct}% dello stato</div>
                          <ProgressBar value={x.value} max={toNumber(selectedStateRow["TOTALE"])} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card title="Dove pesa di più questo stato?">
                {(() => {
                  const row = pipelineRows.find((r) => r.stato === effectiveState);
                  if (!row) return <EmptyInfo text="Nessun dato area disponibile." />;
                  const areaBreakdown = [
                    { area: "NORD OVEST", value: row.no },
                    { area: "NORD EST", value: row.ne },
                    { area: "CENTRO", value: row.ce },
                    { area: "SUD", value: row.sud },
                  ].sort((a, b) => b.value - a.value);
                  return (
                    <div style={{ display: "grid", gap: 8 }}>
                      {areaBreakdown.map((x, idx) => (
                        <div key={x.area} style={{ border: "1px solid #E5E7EB", borderRadius: 12, padding: 12, background: "#fff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800 }}>
                              {x.area} {idx === 0 ? "🔥" : ""}
                            </div>
                            <div style={{ fontWeight: 800 }}>{x.value}</div>
                          </div>
                          <div style={{ color: "#6B7280", fontSize: 13 }}>
                            {row.totale > 0 ? ((x.value / row.totale) * 100).toFixed(1) : "0.0"}% dello stato
                          </div>
                          <ProgressBar value={x.value} max={row.totale} color={idx === 0 ? "#DC2626" : "#2563EB"} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </Card>
            </div>
          </Card>
        )}

        {tab === "regioni" && (
          <div style={{ display: "grid", gridTemplateColumns: selected ? "1.1fr 1fr" : "1fr", gap: 16 }}>
            <Card title="Regioni" style={{ minHeight: 420 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                <div style={{ color: "#6B7280" }}>Clicca una regione per vedere il dettaglio tipologie</div>
                <div>
                  <label style={{ marginRight: 8, fontWeight: 700 }}>Area:</label>
                  <select
                    value={areaFilter}
                    onChange={(e) => {
                      setAreaFilter(e.target.value);
                      setSelectedRegion(null);
                    }}
                    style={{ padding: 8, borderRadius: 8 }}
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {filteredRegions.map((r, idx) => (
                  <div
                    key={r.regione}
                    onClick={() => setSelectedRegion(r.regione)}
                    style={{
                      cursor: "pointer",
                      padding: 12,
                      borderRadius: 12,
                      border: selectedRegion === r.regione ? "2px solid #111827" : "1px solid #E5E7EB",
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <Badge bg={idx === 0 ? "#FEF2F2" : "#EEF2FF"} color={idx === 0 ? "#B91C1C" : "#3730A3"}>
                          {idx + 1}
                        </Badge>
                        <div>
                          <div style={{ fontWeight: 800 }}>{r.regione}</div>
                          <div style={{ fontSize: 13, color: "#6B7280" }}>{r.area}</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 20 }}>{r.totale}</div>
                    </div>
                    <ProgressBar value={r.totale} max={filteredRegions[0]?.totale || 1} color={idx === 0 ? "#DC2626" : "#2563EB"} />
                  </div>
                ))}
              </div>
            </Card>

            {selected && (
              <Card title={`Dettaglio ${selected.regione}`}>
                <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <InfoRow label="Area" value={selected.area} />
                  <InfoRow label="Totale residui" value={selected.totale} />
                </div>

                {selectedRegionValues.length === 0 || selectedRegionValues.every((x) => x.value === 0) ? (
                  <EmptyInfo text={`Nessun residuo disponibile per ${selected.regione}.`} />
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedRegionValues.map((x, idx) => {
                      const pct = selected.totale > 0 ? ((x.value / selected.totale) * 100).toFixed(1) : "0.0";
                      return (
                        <div
                          key={x.tipologia}
                          style={{
                            border: "1px solid #E5E7EB",
                            borderRadius: 12,
                            padding: 12,
                            background: "#fff",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={{ fontWeight: 800 }}>
                              {x.tipologia} {idx === 0 ? "🔥" : ""}
                            </div>
                            <div style={{ fontWeight: 800 }}>{x.value}</div>
                          </div>
                          <div style={{ marginTop: 4, color: "#6B7280", fontSize: 13 }}>
                            {pct}% del totale regione
                          </div>
                          <ProgressBar value={x.value} max={selected.totale} color={idx === 0 ? "#DC2626" : "#2563EB"} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
