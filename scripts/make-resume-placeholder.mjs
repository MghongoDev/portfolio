// Generates a one-page placeholder PDF at public/David-Mwandairo-Resume.pdf.
// Delete this script once the real resume PDF is in place.
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

let y = 780;
const ops = [];
function text(str, size, font = "F2") {
  ops.push(`BT /${font} ${size} Tf 56 ${y} Td (${esc(str)}) Tj ET`);
  y -= size * 1.7;
}
function gap(amount) {
  y -= amount;
}

text("David Mwandairo", 22, "F1");
text("Data Engineer & Data Scientist", 13);
text("mwandairodavid@gmail.com  |  github.com/MghongoDev  |  linkedin.com/in/david-mwandairo", 9);
gap(22);
text("Placeholder resume", 14, "F1");
gap(6);
text("This file is wired into the portfolio's download button so the link works before the", 10);
text("final resume exists. To replace it: overwrite public/David-Mwandairo-Resume.pdf in", 10);
text("the portfolio repository with the real PDF and push - no other changes needed.", 10);
gap(18);
text("Portfolio: https://dmwandairo.vercel.app", 10);

const content = ops.join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const outDir = path.join(process.cwd(), "public");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "David-Mwandairo-Resume.pdf"), pdf, "latin1");
console.log("Wrote public/David-Mwandairo-Resume.pdf");
