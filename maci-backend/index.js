const express = require("express");
const ExcelJS = require("exceljs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

/* =============================
   CONFIGURACIÓN DEL EXCEL
============================= */

const PORT = 3001;
const EXCEL_PATH = path.join(__dirname, "maci_engine.xlsx");

// Nombre de hojas
const INPUT_SHEET = "DATOS Y RESPUESTAS";
const RESULTS_SHEET = "RESULTADOS";

// Donde empieza la primera respuesta
const START_ROW = 14;

// Cantidad de respuestas por columna
const ITEMS_PER_COLUMN = 25;

// Columnas de respuestas (C, E, G, I, K, M, O)
const RESPONSE_COLUMNS = [
  3,  // C  -> respuestas 1–25
  5,  // E  -> respuestas 26–50
  7,  // G  -> respuestas 51–75
  9,  // I  -> respuestas 76–100
  11, // K  -> respuestas 101–125
  13, // M  -> respuestas 126–150
  15  // O  -> respuestas 151–160
];

const TOTAL_ITEMS = 160;

/* =============================
   ENDPOINT PRINCIPAL
============================= */

app.post("/maci", async (req, res) => {
  try {
    const { respuestas } = req.body;

    // Validaciones básicas
    if (!Array.isArray(respuestas)) {
      return res.status(400).json({
        error: "respuestas debe ser un array",
      });
    }

    if (respuestas.length !== TOTAL_ITEMS) {
      return res.status(400).json({
        error: `Se requieren exactamente ${TOTAL_ITEMS} respuestas`,
      });
    }

    // 1️⃣ Cargar Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(EXCEL_PATH);

    const wsInput = workbook.getWorksheet(INPUT_SHEET);
    const wsResults = workbook.getWorksheet(RESULTS_SHEET);

    if (!wsInput || !wsResults) {
      return res.status(500).json({
        error: "No se encontraron las hojas MACI o RESULTADOS",
      });
    }

    // 2️⃣ Escribir respuestas en la PRIMERA HOJA
    // Mapeo vertical por columnas (como tu Excel real)
    for (let i = 0; i < respuestas.length; i++) {
      const columnIndex = Math.floor(i / ITEMS_PER_COLUMN);
      const rowOffset = i % ITEMS_PER_COLUMN;

      const col = RESPONSE_COLUMNS[columnIndex];
      const row = START_ROW + rowOffset;

      const value = respuestas[i] === "V" ? "V" : "F";
      wsInput.getRow(row).getCell(col).value = value;
    }

    // 3️⃣ Forzar recálculo
    workbook.calcProperties.fullCalcOnLoad = true;

    // 4️⃣ Leer RESULTADOS
    const results = [];

    wsResults.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const escala = row.getCell(1).value;
      if (!escala) return;

      results.push({
        escala,
        pd: row.getCell(2).value,
        tb: row.getCell(3).value,
        tbFinal: row.getCell(4).value,
        interpretacion: row.getCell(5).value,
      });
    });

    // 5️⃣ Responder
    return res.json({
      ok: true,
      results,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err.message,
    });
  }
});

/* =============================
   START SERVER
============================= */

app.listen(PORT, () => {
  console.log(`MACI backend corriendo en http://localhost:${PORT}`);
});
