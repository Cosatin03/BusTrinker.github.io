// Public Firebase web configuration. Access must be controlled with Firestore rules.
const firebaseConfig = {
  apiKey: "AIzaSyAw5zRVmbvHGJUFKV0LGthGWsE4EqPN-Bw",
  authDomain: "bust-42c39.firebaseapp.com",
  projectId: "bust-42c39",
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.bustrinkerDb = firebase.firestore();
