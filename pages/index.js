import { useState } from "react";

export default function Home() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();

    const rows = text.split("\n").map(r => r.split(","));
    const headers = rows[0];
    const body = rows.slice(1);

    const parsed = body.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h.trim()] = row[i]);
      return obj;
    });

    setData(parsed);
    setSelected(parsed[0]?.["STATO"] || "");
  };

  const stati = [...new Set(data.map(d => d["STATO"]))];

  const breakdown = data.filter(d => d["STATO"] === selected);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>📊 Dashboard Collaudi</h1>

      <input type="file" onChange={handleFile} />

      <h2>Pipeline Stati</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {stati.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            style={{
              padding: 10,
              cursor: "pointer",
              background: selected === s ? "#cce5ff" : "#eee"
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <h2>Breakdown: {selected}</h2>

      <div>
        {breakdown.map((row, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            {Object.entries(row)
              .filter(([k]) => k !== "STATO")
              .map(([k, v]) => (
                <span key={k} style={{ marginRight: 15 }}>
                  <b>{k}</b>: {v}
                </span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
