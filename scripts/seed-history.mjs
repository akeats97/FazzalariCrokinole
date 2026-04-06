import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, terminate } from 'firebase/firestore';

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

const entries = [
  { winners: ['Matt', 'Alex'],         date: new Date('2026-04-05T12:00:00') },
  { winners: ['Chris', 'Ryan'],        date: new Date('2024-12-25T12:00:00') },
  { winners: ['Chris', 'Matt'],        date: new Date('2023-12-25T12:00:00') },
  { winners: ['Chris', 'Vic', 'Alex'], date: new Date('2022-12-25T12:00:00') },
];

for (const entry of entries) {
  const ref = await addDoc(collection(db, 'cupHistory'), {
    winners: entry.winners,
    date: Timestamp.fromDate(entry.date),
    tournamentId: null,
  });
  console.log('Added:', ref.id, '—', entry.winners.join(' & '));
}

await terminate(db);
console.log('Done.');
process.exit(0);
