import { readFile } from "node:fs/promises";

const files = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("styles.css", "utf8"),
  readFile("app.js", "utf8"),
]);

const required = [
  "Planalityc",
  "Шахматка",
  "Договор",
  "Начисления",
  "Клиентский портал",
  "Client Relations",
];

for (const term of required) {
  if (!files.some((content) => content.includes(term))) {
    throw new Error(`Missing required product term: ${term}`);
  }
}

console.log("Smoke test passed");
