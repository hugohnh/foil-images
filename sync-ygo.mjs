// Images des cartes Yu-Gi-Oh! pour Foil (https://github.com/hugohnh/TCG-Card) : YGOPRODeck demande de télécharger ses
// images une seule fois et de les héberger soi-même. Ce script ajoute les images manquantes dans ygo/{id}.webp
// (200 px de large, WebP), sans jamais retélécharger une image déjà présente. Rythme : 8 images par seconde au plus
// (YGOPRODeck bloque au-delà de 20 requêtes par seconde).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const UA = { 'User-Agent': 'Foil/1.0 (+https://github.com/hugohnh/TCG-Card)' };
const MAX = Number(process.env.MAX ?? 20000);
mkdirSync('ygo', { recursive: true });
const sleep = ms => new Promise(ok => setTimeout(ok, ms));

const res = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php', { headers: UA });
if (!res.ok) throw new Error(`YGOPRODeck ${res.status}`);
const { data } = await res.json();
const ids = [...new Set(data.flatMap(c => (c.card_images ?? []).map(i => i.id)))];
const todo = ids.filter(id => !existsSync(`ygo/${id}.webp`)).slice(0, MAX);
console.log(`${ids.length} images connues, ${todo.length} à ajouter.`);
let done = 0, failed = 0;
for (const id of todo) {
  const t0 = Date.now();
  try {
    const r = await fetch(`https://images.ygoprodeck.com/images/cards_small/${id}.jpg`, { headers: UA });
    if (r.status === 429) { console.log('Trop de requêtes : pause de 60 s.'); await sleep(60_000); continue; }
    if (!r.ok) throw new Error(String(r.status));
    const webp = await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: 200 }).webp({ quality: 72 }).toBuffer();
    writeFileSync(`ygo/${id}.webp`, webp);
    done++;
  } catch (e) {
    failed++;
    if (failed <= 5) console.log(`Image ${id} : ${e.message}`);
  }
  if ((done + failed) % 500 === 0) console.log(`${done} ajoutées, ${failed} échecs…`);
  await sleep(Math.max(0, 125 - (Date.now() - t0)));
}
console.log(`Terminé : ${done} images ajoutées, ${failed} échecs.`);
