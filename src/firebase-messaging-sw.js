importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA3lMkHJQKMi6D8_OoLJHcu23D0KaKSnVU",
  authDomain: "frigosage.firebaseapp.com",
  projectId: "frigosage",
  storageBucket: "frigosage.firebasestorage.app",
  messagingSenderId: "354925420146",
  appId: "1:354925420146:web:bfc9655464fb4318f6eceb"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gestion Arrière-plan (App fermée)
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Message reçu:', payload);
  
  let title = payload.notification.title;
  let body = payload.notification.body;
  
  // Personnalisation selon le type
  if (payload.data && payload.data.type === 'NEW_RIDE') {
    title = '🚖 NOUVELLE COURSE !';
    body = payload.data.from + ' ➔ ' + payload.data.to;
  } else if (payload.data && payload.data.type === 'CHAT_MSG') {
    title = '💬 Message de ' + payload.data.sender;
  }

  self.registration.showNotification(title, {
    body: body,
    icon: '/favicon.ico',
    data: payload.data
  });
});
