
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const pipelineStati = [
  "In progettazione",
  "Da aprire",
  "In construction, attesa CUIR",
  "Cuir NO Asb",
  "ASB inviati in analisi INF",
  "Rifiuto in carico a OF",
  "Da collaudare INF",
  "Prescrizione in carico a OF",
  "Prescrizioni in carico INF",
];

const matrice = {
  "In progettazione": { FTTH: 1, PCN: 7, PRI: 0, FIBRA_INT: 300, SRB: 0 },
  "Da aprire": { FTTH: 3, PCN: 5, PRI: 8, FIBRA_INT: 90, SRB: 0 },
  "In construction, attesa CUIR": { FTTH: 64, PCN: 71, PRI: 137, FIBRA_INT: 151, SRB: 1 },
  "Cuir NO Asb": { FTTH: 267, PCN: 75, PRI: 127, FIBRA_INT: 50, SRB: 139 },
  "ASB inviati in analisi INF": { FTTH: 21, PCN: 14, PRI: 11, FIBRA_INT: 44, SRB: 34 },
  "Rifiuto in carico a OF": { FTTH: 106, PCN: 26, PRI: 29, FIBRA_INT: 5, SRB: 44 },
  "Da collaudare INF": { FTTH: 64, PCN: 20, PRI: 45, FIBRA_INT: 14, SRB: 24 },
  "Prescrizione in carico a OF": { FTTH: 86, PCN: 10, PRI: 15, FIBRA_INT: 0, SRB: 0 },
  "Prescrizioni in carico INF": { FTTH: 29, PCN: 4, PRI: 6, FIBRA_INT: 0, SRB: 2 },
};


const topRegioni = [
  { nome: "Lombardia", valore: 828 },
  { nome: "Piemonte", valore: 357 },
  { nome: "Emilia-Romagna", valore: 195 },
  { nome: "Veneto", valore: 184 },
  { nome: "Lazio", valore: 137 },
];


export default function DashboardCollaudi() {
  const [selected, setSelected] = useState("Cuir NO Asb");
  const data = matrice[selected];
  const max = Math.max(...Object.values(data));
  return (
    <div className="p-6 grid gap-6">
      <h1 className="text-2xl font-bold">📊 Dashboard Collaudi</h1>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 gap-2">
          <TabsTrigger value="overview">Pipeline</TabsTrigger>
          <TabsTrigger value="matrice">Matrice</TabsTrigger>
          <TabsTrigger value="regioni">Regioni</TabsTrigger>
          <TabsTrigger value="kpi">KPI</TabsTrigger>
        </TabsList>

        {/* PIPELINE CLICKABILE */}
        <TabsContent value="overview">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">Pipeline Stati</h2>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {pipelineStati.map((s) => (
                  <div
                    key={s}
                    onClick={() => setSelected(s)}
                    className={`p-2 border rounded cursor-pointer ${selected === s ? "bg-blue-100" : ""}`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MATRICE EVOLUTA */}
        <TabsContent value="matrice">
          <Card>
            <CardContent className="p-4 grid gap-4">
              <h2 className="text-lg font-semibold">Breakdown: {selected}</h2>

              <div className="grid grid-cols-5 gap-4">                {Object.entries(data).map(([k, v]) => (
                  <div key={k} className="bg-gray-100 p-4 rounded">
                    <p className="text-sm text-gray-600">{k}</p>
                    <p className="text-lg font-bold">{v}</p>
                    <div className="w-full bg-gray-300 h-2 mt-2 rounded">
                      <div
                        className="bg-blue-500 h-2 rounded"
                        style={{ width: `${(v / max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* TOP REGIONI */}        <TabsContent value="regioni">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold mb-4">Top Regioni - Residui</h2>
              <div className="space-y-2">
                {topRegioni.map((r) => (
                  <div key={r.nome}>
                    <div className="flex justify-between text-sm">
                      <span>{r.nome}</span>
                      <span>{r.valore}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded">
                      <div
                        className="bg-red-500 h-2 rounded"
                        style={{ width: `${(r.valore / 828) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI */}
        <TabsContent value="kpi">
          <Card>
            <CardContent className="p-4 grid grid-cols-3 gap-4">
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-sm text-gray-600">Totale Residui</p>
                <p className="text-xl font-bold">2319</p>
              </div>
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-sm text-gray-600">Driver principale</p>
                <p className="text-xl font-bold">CUIR NO ASB</p>
              </div>
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-sm text-gray-600">Area critica</p>
                <p className="text-xl font-bold">Lombardia</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
