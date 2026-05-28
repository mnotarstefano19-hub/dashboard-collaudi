import { useState } from "react";

export default function Home() {
  const [matrix, setMatrix] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selected, setSelected] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();

    const lines = text.split("\n");

    // trova riga "MATRICE RESIDUI"
    const startIndex = lines.findIndex(l =>
      l.includes("MATRICE RESIDUI")
    );

    if (startIndex === -1) {
      alert("Non trovo la matrice nel file");
      return;
    }

    // header = riga dopo
    const headerLine = lines[startIndex + 1];
    const headers = headerLine.split(";").map(h => h.trim());
    setHeaders(headers);

    // dati = righe successive
    let rows = [];
    for (let i = startIndex + 2; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line || line.startsWith("📍")) break;

      let values = line.split(";");

      let obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx];
      });

      rows.push(obj);
    }

    setMatrix(rows);
    setSelected(rows[0]?.[headers[0]]);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Dashboard Collaudi</h1>

      <input type="file" onChange={handleFile} />

      <h2>Pipeline Stati</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {matrix.map((row, i) => (
          <button
            key={i}
            onClick={() => setSelected(row[headers[0]])}
            style={{
              padding: 10,
              background:
                selected === row[headers[0]] ? "#cce5ff" : "#eee"
            }}
          >
            {row[headers[0]]}
          </button>
        ))}
      </div>

      <h2>Breakdown: {selected}</h2>

      {matrix
        .filter(row => row[headers[0]] === selected)
        .map((row, i) => (
          <div key={i} style={{ marginTop: 20 }}>
            {headers.slice(1).map((h) => (
              <div key={h}>
                <b>{h}</b>: {row[h]}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
