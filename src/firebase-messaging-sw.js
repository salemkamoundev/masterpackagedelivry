importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDJm6gOw0CSNlbWXP2BAX3etHZPBn9ARZY",
  authDomain: "masterdeliverpackage.firebaseapp.com",
  databaseURL: "https://masterdeliverpackage-default-rtdb.firebaseio.com",
  projectId: "masterdeliverpackage",
  storageBucket: "masterdeliverpackage.firebasestorage.app",
  messagingSenderId: "406875058530",
  appId: "1:406875058530:web:e872e7a5eea2ccc870fc3b",
  measurementId: "G-X9MGMQ3BVG"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
