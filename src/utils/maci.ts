export interface MaciResult {
  scales: Record<string, number>;
  validity: {
    protocoloValido: boolean;
    transparencia: number;
    deseabilidad: number;
    alteracion: number;
    warnings: string[];
  };
}

export const MACI_COLUMN_MAP: Record<string, string> = {
  X: "X-Transparencia",
  Y: "Y-Deseabilidad",
  Z: "Z-Alteración",

  "1": "1-Introvertido",
  "2A": "2A-Inhibido",
  "2B": "2B-Pesimista",
  "3": "3-Sumiso",
  "4": "4-Histriónico",
  "5": "5-Egocéntrico",
  "6A": "6A-Rebelde",
  "6B": "6B-Rudo",
  "7": "7-Conformista",
  "8A": "8A-Oposicionista",
  "8B": "8B-Autopunitivo",
  "9": "9-Tendencia Límite",

  A: "A-Difusión de la Identidad",
  B: "B-Desvalorización de sí mismo.",
  C: "C-Desagrado por propio cuerpo",
  D: "D-Incomodidad respecto al sexo",
  E: "E-Inseguridad con los iguales",
  F: "F-Insensibiidad social",
  G: "G-Discordancia Familiar",
  H: "H-Abusos en la infancia",

  AA: "AA-Trastornos de la Alimentación",
  BB: "BB-Inclinación abuso sustancias",
  CC: "CC-Predisposición a la delincuencia",
  DD: "DD-Propensión a la impulsividad",
  EE: "EE-Sentimientos de ansiedad",
  FF: "FF-Afecto depresivo",
  GG: "GG-Tendencia al suicidio",
};

export function parseMACIFromExcel(row: Record<string, any>): MaciResult {
  const scales: Record<string, number> = {};

  const getValue = (col: string) => {
    const v = row[col];
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };
  for (const key in MACI_COLUMN_MAP) {
    scales[key] = getValue(MACI_COLUMN_MAP[key]);
  }

  const transparencia = scales["X"];
  const deseabilidad = scales["Y"];
  const alteracion = scales["Z"];

  const warnings: string[] = [];

  if (transparencia < 150) {
    warnings.push("Baja transparencia en las respuestas");
  }
  if (deseabilidad > 20) {
    warnings.push("Alta deseabilidad social");
  }
  if (alteracion > 15) {
    warnings.push("Posible exageración o distorsión de síntomas");
  }

  return {
    scales,
    validity: {
      protocoloValido: warnings.length === 0,
      transparencia,
      deseabilidad,
      alteracion,
      warnings,
    },
  };
}
