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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
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
    <div
      style={{
        height: 8,
        background: "#F2F4F7",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: 8,
          background: colors[tone] || colors.blue,
        }}
      />
    </div>
  );
}

function EmptyState({ title, text, tone = "green" }) {
  const styles = {
    green: {
      bg: "#ECFDF3",
      border: "#D1FADF",
      color: "#027A48",
    },
    red: {
      bg: "#FEF2F2",
      border: "#FEE2E2",
      color: "#B91C1C",
    },
    amber: {
      bg: "#FFFBEB",
      border: "#FDE68A",
      color: "#B45309",
    },
    blue: {
      bg: "#EEF4FF",
      border: "#DDE7FF",
      color: "#1D4ED8",
    },
  };

  const s = styles[tone] || styles.green;

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        fontWeight: 700,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 4 }}>{title}</div>
      <div>{text}</div>
    </div>
  );
}

export default function DashboardCollaudiFinale() {
  const [rawLines, setRawLines] = useState([]);
  const [tab, setTab] = useState("pipeline");
  const [selectedState, setSelectedState] = useState("");
  const [areaFilter, setAreaFilter] = useState("TUTTE");
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadRemoteData = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const res = await fetch(DATA_URL);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      const lines = text.replace(/\r/g, "").split("\n");
      setRawLines(lines);
      setSelectedState("");
      setSelectedRegion(null);
      setAreaFilter("TUTTE");
      setTab("pipeline");
    } catch (e) {
      console.error("Errore caricamento dati:", e);
      setLoadError("Non riesco a leggere il CSV remoto. Verifica che il file esista e che il link RAW sia corretto.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRemoteData();
  }, []);

  const parsed = useMemo(() => {
    if (!rawLines.length) return null;

    const pipeline = parseSectionTable(
      rawLines,
      (l) =>
        l.startsWith("#;") &&
        l.includes("STATO AVANZAMENTO") &&
        l.includes("ITALIA"),
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

  // ---------- PIPELINE ----------
  const pipelineRows = useMemo(() => {
    if (!parsed?.pipeline?.rows) return [];
    return parsed.pipeline.rows.filter((r) => {
      const s = (r["STATO AVANZAMENTO"] || "").trim();
      if (!s) return false;
      return !/^TOTALE/i.test(s);
    });
  }, [parsed]);

  const stateOptions = useMemo(
    () => pipelineRows.map((r) => r["STATO AVANZAMENTO"]),
    [pipelineRows]
  );

  const selected = useMemo(() => {
    if (!stateOptions.length) return "";
    if (selectedState && stateOptions.includes(selectedState)) return selectedState;
    return stateOptions[0];
  }, [stateOptions, selectedState]);

  // ---------- MATRICE ----------
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
      matrixRows.find(
        (r) =>
          (r[statoKey] || "").trim().toLowerCase() === selected.toLowerCase()
      );
    return row || null;
  }, [matrixRows, statoKey, selected]);

  const selectedTotal = useMemo(() => {
    if (!matrixRowForSelected) return 0;
    return toNumber(
      matrixRowForSelected["TOTALE"] ?? matrixRowForSelected["TOTALE;"]
    );
  }, [matrixRowForSelected]);

  const selectedTypologyValues = useMemo(() => {
    if (!matrixRowForSelected) return [];
    return typologies.map((t) => {
      const raw =
        matrixRowForSelected[t] ?? matrixRowForSelected[t.replace(/_/g, "\\_")];
      return { tipologia: t, value: toNumber(raw) };
    });
  }, [matrixRowForSelected, typologies]);

  const maxTypologyInSelected = useMemo(() => {
    if (!selectedTypologyValues.length) return { tipologia: "-", value: 0 };
    return selectedTypologyValues.reduce(
      (best, cur) => (cur.value > best.value ? cur : best),
      selectedTypologyValues[0]
    );
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
    const bottleneck = items.reduce(
      (best, cur) => (cur.italia > best.italia ? cur : best),
      items[0]
    );
    return { items, totalResidui, bottleneck };
  }, [pipelineRows]);

  // ---------- REGIONI ----------
  const regioniHeader = parsed?.regioni?.header || [];
  const regioniRows = parsed?.regioni?.rows || [];

  const regionTypologies = useMemo(() => {
    if (!regioniHeader.length) return [];
    return regioniHeader
      .filter((h) => !["AREA", "REGIONE", "TOTALE"].includes(h))
      .map((h) => h.replace(/\\_/g, "_"));
  }, [regioniHeader]);

  const areas = useMemo(() => {
    const set = new Set();
    regioniRows.forEach((r) => {
      const a = (r["AREA"] || "").trim();
      const reg = (r["REGIONE"] || "").trim();
      if (!a || !reg || /TOTALE/i.test(reg)) return;
      set.add(a);
    });
    return ["TUTTE", ...Array.from(set)];
  }, [regioniRows]);

  const filteredRegionRows = useMemo(() => {
    return regioniRows.filter((r) => {
      const area = (r["AREA"] || "").trim();
      const reg = (r["REGIONE"] || "").trim();
      if (!area || !reg) return false;
      if (/TOTALE/i.test(reg)) return false;
      if (areaFilter !== "TUTTE" && area !== areaFilter) return false;
      return true;
    });
  }, [regioniRows, areaFilter]);

  const topRegioni = useMemo(() => {
    const rows = filteredRegionRows
      .map((r) => ({
        area: (r["AREA"] || "").trim(),
        regione: (r["REGIONE"] || "").trim(),
        totale: toNumber(r["TOTALE"]),
        raw: r,
      }))
      .sort((a, b) => b.totale - a.totale);
    return rows.slice(0, 10);
  }, [filteredRegionRows]);

  const areaTotals = useMemo(() => {
    const map = new Map();
    filteredRegionRows.forEach((r) => {
      const area = (r["AREA"] || "").trim();
      const reg = (r["REGIONE"] || "").trim();
      if (!area || !reg || /TOTALE/i.test(reg)) return;
      map.set(area, (map.get(area) || 0) + toNumber(r["TOTALE"]));
    });
    const arr = Array.from(map.entries()).map(([area, totale]) => ({
      area,
      totale,
    }));
    arr.sort((a, b) => b.totale - a.totale);
    return arr;
  }, [filteredRegionRows]);

  const criticalArea = areaTotals[0] || { area: "-", totale: 0 };
  const criticalRegion = topRegioni[0] || {
    regione: "-",
    totale: 0,
    area: "-",
  };

  const regionDetail = useMemo(() => {
    if (!selectedRegion) return null;
    const row = filteredRegionRows.find(
      (r) => (r["REGIONE"] || "").trim() === selectedRegion
    );
    if (!row) return null;
    const totale = toNumber(row["TOTALE"]);
    const values = regionTypologies
      .map((t) => ({
        tipologia: t,
        value: toNumber(row[t] ?? row[t.replace(/_/g, "\\_")]),
      }))
      .sort((a, b) => b.value - a.value);

    const driver = values[0] || { tipologia: "-", value: 0 };
    return {
      regione: selectedRegion,
      area: (row["AREA"] || "").trim(),
      totale,
      values,
      driver,
    };
  }, [selectedRegion, filteredRegionRows, regionTypologies]);

  // ---------- ACTION CENTER ----------
  const actionCenter = useMemo(() => {
    if (!pipelineStats) return [];
    const a = [];
    const b = pipelineStats.bottleneck;

    a.push({
      tone: "red",
      title: "Bottleneck principale",
      text: `${b.stato} = ${b.italia} residui (${b.pct.toFixed(1)}% del totale)`,
    });

    a.push({
      tone: "amber",
      title: "Area prioritaria",
      text: `${criticalArea.area} = ${criticalArea.totale} residui (concentrazione più alta)`,
    });

    a.push({
      tone: "amber",
      title: "Regione da attaccare subito",
      text: `${criticalRegion.regione} (${criticalRegion.area}) = ${criticalRegion.totale} residui`,
    });

    if (selectedTotal === 0) {
      a.push({
        tone: "green",
        title: "Stato selezionato senza carico",
        text: `${selected}: nessun residuo attuale. Se domani cambia, lo vedrai qui.`,
      });
    } else {
      a.push({
        tone: "blue",
        title: "Driver nello stato selezionato",
        text: `${maxTypologyInSelected.tipologia} pesa di più nello stato “${selected}” (${maxTypologyInSelected.value})`,
      });
    }

    if (regionDetail) {
      a.push({
        tone: regionDetail.totale === 0 ? "green" : "blue",
        title: "Focus Regione selezionata",
        text:
          regionDetail.totale === 0
            ? `${regionDetail.regione}: 0 residui oggi (monitoraggio attivo).`
            : `${regionDetail.regione}: driver = ${regionDetail.driver.tipologia} (${regionDetail.driver.value})`,
      });
    }

    return a;
  }, [
    pipelineStats,
    criticalArea,
    criticalRegion,
    selectedTotal,
    selected,
    maxTypologyInSelected,
    regionDetail,
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#101828" }}>
              📊 Dashboard Collaudi
            </div>
            <div style={{ color: "#667085", marginTop: 4 }}>
              Monitoraggio e controllo — dati caricati automaticamente dal CSV
              remoto.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
             
