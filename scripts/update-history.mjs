import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, terminate } from 'firebase/firestore';

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

// Apr 5 2026: Matt & Alex → Matt & Zander
await updateDoc(doc(db, 'cupHistory', '6biHEYz2YwdBpxNWcxjo'), {
  winners: ['Matt', 'Zander'],
});
console.log('Updated 2026 entry: Matt & Zander');

// Dec 25 2022: Chris & Vic & Alex → Chris & Vic & Zander
await updateDoc(doc(db, 'cupHistory', 'A4VWk4wMeDzfr3KSOIhh'), {
  winners: ['Chris', 'Vic', 'Zander'],
});
console.log('Updated 2022 entry: Chris & Vic & Zander');

await terminate(db);
process.exit(0);
