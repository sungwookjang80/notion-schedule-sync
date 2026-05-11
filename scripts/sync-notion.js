// Notion public page scraping -> auto update sample-programs.ts
// Source: https://www.notion.so/gsholdings/304f800bd1c180bc87f6de37a20b99ae

const https = require("https");
const fs = require("fs");
const path = require("path");

const PAGE_ID = "304f800bd1c180bc87f6de37a20b99ae";
const OUTPUT_PATH = path.join(process.cwd(), "lib", "sample-programs.ts");

function getCategory(title) {
  if (title.includes("AIxDT") || title.includes("AixDT")) return "AIxDT";
  if (["\uB178\uB3D9\uC808","\uC5B4\uB9B0\uC774\uB0A0","\uD734\uBB34","\uACF5\uD734\uC77C","\uD55C\uAE00\uB0A0","\uC9C0\uBC29\uC120\uAC70","\uB300\uCCB4\uACF5\uD734\uC77C"].some(k => title.includes(k))) return "\uD734\uC77C";
  if (title.includes("\uC0AC\uC7A5\uB2E8\uD68C\uC758")) return "\uADF8\uB8F9";
  if (title.includes("\uCE74\uD0C8\uB9AC\uC2A4\uD2B8")) return "\uCE74\uD0C8";
  if (title.includes("\uD574\uCEE4\uD1A4")) return "\uD574\uCEE4\uD1A4";
  if (["\uD611\uC758\uCCB4","52g","\uCC3E5","\uD29C\uD29C"].some(k => title.includes(k))) return "\uADF8\uB8F9";
  return "\uAE30\uD0C0";
}

async function fetchNotionPage() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ pageId: PAGE_ID, limit: 300, chunkNumber: 0, verticalColumns: false });
    const options = {
      hostname: "www.notion.so", path: "/api/v3/loadPageChunk", method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    };
    const req = https.request(options, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function parseEvents(data) {
  const events = []; const recordMap = data.recordMap;
  if (!recordMap || !recordMap.block) return events;
  let id = 1;
  Object.values(recordMap.block).forEach(({ value: block }) => {
    if (!block || block.type !== "page" || !block.properties) return;
    const titleArr = block.properties.title;
    if (!titleArr) return;
    const title = (titleArr[0]?.[0] || "").trim();
    if (!title) return;
    let dateStr = null;
    for (const key of Object.keys(block.properties)) {
      const propVal = block.properties[key];
      if (!Array.isArray(propVal)) continue;
      for (const item of propVal) {
        if (!Array.isArray(item) || !item[1]) continue;
        for (const sub of item[1]) {
          if (sub[0] === "d" && sub[1]?.start_date) { dateStr = sub[1].start_date; break; }
        }
        if (dateStr) break;
      }
      if (dateStr) break;
    }
    if (!dateStr) return;
    events.push({ id: String(id++), title, date: dateStr, category: getCategory(title), status: "\uC608\uC815", isOpen: false });
  });
  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function generateTsFile(events) {
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  return [
    "// AUTO-GENERATED - Do not edit manually",
    "// Last sync: " + now + " (KST)",
    "// Source: https://www.notion.so/gsholdings/304f800bd1c180bc87f6de37a20b99ae",
    "", "export interface Program {", "  id: string;", "  title: string;",
    "  date: string;", "  category: string;", "  status: string;", "  isOpen: boolean;", "}",
    "", "export const samplePrograms: Program[] = " + JSON.stringify(events, null, 2) + ";",
    "", "export default samplePrograms;", "",
  ].join("\n");
}

async function main() {
  console.log("=== Notion Schedule Sync ===");
  try {
    const data = await fetchNotionPage();
    const events = parseEvents(data);
    console.log("Events:", events.length);
    if (events.length === 0) { console.warn("0 events - skip"); process.exit(0); }
    const libDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, generateTsFile(events), "utf-8");
    console.log("Saved:", OUTPUT_PATH);
  } catch (err) { console.error("Error:", err.message); process.exit(1); }
}
main();
