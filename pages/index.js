import { useState } from "react";

export default function Home() {
  const [selected, setSelected] = useState("Cuir NO Asb");

  const pipeline = [
    "In progettazione",
    "Da aprire",
    "In construction, attesa CUIR",
    "Cuir NO Asb",
    "ASB inviati in analisi INF",
    "Rifiuto in carico a OF"
  ];

  const matrice = {
    "Cuir NO Asb": { FTTH: 267, PCN: 75, PRI: 127 },
    "Da aprire": { FTTH: 3, PCN: 5, PRI: 8 },
    "In progettazione": { FTTH: 1, PCN: 7, PRI: 0 }
  };

  const data = matrice[selected] || {};

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>📊 Dashboard Collaudi</h1>

      <h2>Pipeline</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pipeline.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            style={{
              padding: 10,
              cursor: "pointer",
              background: selected === s ? "#cce5ff" : "#eee",
              border: "1px solid #ccc"
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 30 }}>Breakdown: {selected}</h2>
      <div style={{ display: "flex", gap: 20 }}>
        {Object.entries(data).map(([k, v]) => (
          <div key={k}>
            <strong>{k}</strong>: {v}
          </div>
        ))}
      </div>
    </div>
  );
}
