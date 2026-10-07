import "server-only";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";

/**
 * PDF do comprovante: mesmo conteúdo do ticket térmico, em fonte monoespaçada,
 * com largura de 80mm (ou 58mm) — pode ser impresso em qualquer impressora.
 */
export async function receiptPdf(content: string, format: string) {
  const widthMm = format === "THERMAL_58MM" ? 58 : format === "A4" ? 210 : 80;
  const width = (widthMm / 25.4) * 72;
  const fontSize = format === "THERMAL_58MM" ? 7.5 : format === "A4" ? 10 : 7.6;
  const lines = content.split("\n");
  const height = Math.max(200, lines.length * fontSize * 1.35 + 40);
  return renderToBuffer(
    <Document title="Comprovante de agendamento" author="Sady Roupas">
      <Page size={[width, height]} style={{ padding: 14, fontFamily: "Courier", fontSize }}>
        {lines.map((line, i) => (
          <Text key={i} style={{ lineHeight: 1.35 }}>{line || " "}</Text>
        ))}
      </Page>
    </Document>,
  );
}
