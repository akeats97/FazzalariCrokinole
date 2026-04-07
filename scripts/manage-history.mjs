/**
 * manage-history.mjs
 * Utility for managing Cup History entries in Firestore.
 *
 * Usage:
 *   node scripts/manage-history.mjs list
 *     → Print all cup history entries with their Firestore doc IDs
 *
 *   node scripts/manage-history.mjs add --winners "Emily,Aidan" --date "2023-04-01" [--image "april2023champs.jpg"]
 *     → Add a new entry. Image filename is relative to /champions/ on the site.
 *       Copy the image to public/champions/ before running this.
 *
 *   node scripts/manage-history.mjs attach-image --doc "abc123" --image "dec2025champs.jpg"
 *     → Set or update the imageUrl on an existing entry.
 *       Copy the image to public/champions/ before running this.
 *
 *   node scripts/manage-history.mjs set-date --doc "abc123" --date "2024-03-31"
 *     → Update the date on an existing entry.
 *
 * After any change: git add -A && git commit -m "..." && git push
 * Vercel will deploy the updated public/champions/ images automatically.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  terminate,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnXSQ6DTXg_XHSEdHQkb6_C3id4D11LVw',
  authDomain: 'fazzalaricrokinole.firebaseapp.com',
  projectId: 'fazzalaricrokinole',
  storageBucket: 'fazzalaricrokinole.firebasestorage.app',
  messagingSenderId: '878332087463',
  appId: '1:878332087463:web:9554625f065886298d9f82',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Arg parsing ---
const args = process.argv.slice(2);
const command = args[0];

function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}

// --- Commands ---

async function list() {
  const q = query(collection(db, 'cupHistory'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log('No entries found.');
  } else {
    console.log(`${'Doc ID'.padEnd(22)} ${'Date'.padEnd(12)} ${'Winners'.padEnd(30)} Image`);
    console.log('-'.repeat(85));
    for (const d of snap.docs) {
      const { winners, date, imageUrl } = d.data();
      const dateStr = date.toDate().toISOString().slice(0, 10);
      console.log(
        `${d.id.padEnd(22)} ${dateStr.padEnd(12)} ${winners.join(' & ').padEnd(30)} ${imageUrl ?? '(none)'}`
      );
    }
  }
}

async function add() {
  const winnersArg = getArg('winners');
  const dateArg = getArg('date');
  const imageArg = getArg('image');

  if (!winnersArg || !dateArg) {
    console.error('Usage: add --winners "Name1,Name2" --date "YYYY-MM-DD" [--image "filename.jpg"]');
    process.exit(1);
  }

  const winners = winnersArg.split(',').map((s) => s.trim());
  const date = new Date(`${dateArg}T12:00:00`);
  if (isNaN(date)) {
    console.error(`Invalid date: ${dateArg}. Use YYYY-MM-DD format.`);
    process.exit(1);
  }

  const imageUrl = imageArg ? `/champions/${imageArg}` : null;

  const ref = await addDoc(collection(db, 'cupHistory'), {
    winners,
    date: Timestamp.fromDate(date),
    tournamentId: null,
    imageUrl,
  });

  console.log(`✓ Added doc ${ref.id} — ${winners.join(' & ')} (${dateArg})${imageUrl ? ` with image ${imageUrl}` : ' (no image)'}`);
  if (!imageUrl) {
    console.log(`  To attach an image later: node scripts/manage-history.mjs attach-image --doc "${ref.id}" --image "yourfile.jpg"`);
  }
}

async function attachImage() {
  const docId = getArg('doc');
  const imageArg = getArg('image');

  if (!docId || !imageArg) {
    console.error('Usage: attach-image --doc "<firestore-doc-id>" --image "filename.jpg"');
    console.error('Run "list" first to find doc IDs.');
    process.exit(1);
  }

  const imageUrl = `/champions/${imageArg}`;
  await updateDoc(doc(db, 'cupHistory', docId), { imageUrl });
  console.log(`✓ Updated ${docId} → imageUrl set to ${imageUrl}`);
}

async function setDate() {
  const docId = getArg('doc');
  const dateArg = getArg('date');

  if (!docId || !dateArg) {
    console.error('Usage: set-date --doc "<firestore-doc-id>" --date "YYYY-MM-DD"');
    console.error('Run "list" first to find doc IDs.');
    process.exit(1);
  }

  const date = new Date(`${dateArg}T12:00:00`);
  if (isNaN(date)) {
    console.error(`Invalid date: ${dateArg}. Use YYYY-MM-DD format.`);
    process.exit(1);
  }

  await updateDoc(doc(db, 'cupHistory', docId), { date: Timestamp.fromDate(date) });
  console.log(`✓ Updated ${docId} → date set to ${dateArg}`);
}

// --- Router ---

if (command === 'list') {
  await list();
} else if (command === 'add') {
  await add();
} else if (command === 'attach-image') {
  await attachImage();
} else if (command === 'set-date') {
  await setDate();
} else {
  console.error('Unknown command. Use: list | add | attach-image');
  console.error('Run with no args or see top of file for full usage.');
  process.exit(1);
}

await terminate(db);
process.exit(0);
