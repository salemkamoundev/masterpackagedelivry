importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDJm6gOw0CSNlbWXP2BAX3etHZPBn9ARZY",
    authDomain: "masterdeliverpackage.firebaseapp.com",
    databaseURL: "https://masterdeliverpackage-default-rtdb.firebaseio.com",
    projectId: "masterdeliverpackage",
    storageBucket: "masterdeliverpackage.firebasestorage.app",
    messagingSenderId: "406875058530",
    appId: "1:406875058530:web:e872e7a5eea2ccc870fc3b",
    vapidKey: "6t6TwDj1UWMX-28vaNw2-yfizYsbjHsQ_MD44qTIoQo",
    measurementId: "G-X9MGMQ3BVG"
});

const messaging = firebase.messaging();

// Affiche les notifications en background
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/assets/icons/icon-128x128.png'
  });
});
