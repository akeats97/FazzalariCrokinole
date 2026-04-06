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

// Images are served from /champions/ on the deployed app (public/ folder → Vercel CDN)
const images = [
  {
    docId: '6biHEYz2YwdBpxNWcxjo',
    imageUrl: '/champions/matt&alexEaster2026Champs.jpg',
    label: '2026 Matt & Zander',
  },
  {
    docId: 'qrbCHY2v8eF4aaofdT7K',
    imageUrl: '/champions/dec2024champs.png',
    label: '2024 Chris & Ryan',
  },
  {
    docId: '2nnMprFn4BvnzNzltXOY',
    imageUrl: '/champions/dec2023champs.png',
    label: '2023 Chris & Matt',
  },
  {
    docId: 'A4VWk4wMeDzfr3KSOIhh',
    imageUrl: '/champions/dec2022champs.png',
    label: '2022 Chris & Vic & Zander',
  },
];

for (const { docId, imageUrl, label } of images) {
  await updateDoc(doc(db, 'cupHistory', docId), { imageUrl });
  console.log(`✓ ${label} → ${imageUrl}`);
}

await terminate(db);
console.log('Done.');
process.exit(0);
