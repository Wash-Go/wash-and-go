// Firebase WEB config — PUBLIC by design (ships in the client bundle; safe to
// commit). Same project as the customer app (wash-and-go-28cce). Security comes
// from enabled providers + rules + the server verifying the ID token, not from
// hiding these values.
export const firebaseConfig = {
  apiKey: 'AIzaSyAx9ZVcIwIvnCYCw0ElF_1NYpqeBbtRdl8',
  authDomain: 'wash-and-go-28cce.firebaseapp.com',
  projectId: 'wash-and-go-28cce',
  storageBucket: 'wash-and-go-28cce.firebasestorage.app',
  messagingSenderId: '84512730514',
  appId: '1:84512730514:web:a9cc8f4aa064e20591a54b',
};
