
// In dieser Datei werden die Firebase-Konfigurationsdaten sicher aufbewahrt.

const firebaseConfig = {
  apiKey: "AIzaSyAw5zRVmbvHGJUFKV0LGthGWsE4EqPN-Bw",
  authDomain: "bust-42c39.firebaseapp.com",
  projectId: "bust-42c39"
};

// Initialisiert Firebase nur einmal
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Stellt die Firestore-Datenbankinstanz global zur Verfügung
const db = firebase.firestore();
