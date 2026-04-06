import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnXSQ6DTXg_XHSEdHQkb6_C3id4D11LVw',
  authDomain: 'fazzalaricrokinole.firebaseapp.com',
  projectId: 'fazzalaricrokinole',
  storageBucket: 'fazzalaricrokinole.firebasestorage.app',
  messagingSenderId: '878332087463',
  appId: '1:878332087463:web:9554625f065886298d9f82',
  measurementId: 'G-14NRSFD3T8',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
