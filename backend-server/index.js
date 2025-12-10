const admin = require('firebase-admin');
const path = require('path');
const { log } = require('console');

// ⚠️ Clé de service (téléchargée depuis la console Firebase)
const serviceAccount = require('../serviceAccountKey.json');
console.log('🧾 serviceAccount project_id =', serviceAccount.project_id);

// Initialisation Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

console.log("Tentative de connexion à Firestore...");
console.log("------------------------------------------------");
console.log("👀 LE ROBOT EST EN LIGNE !");
console.log("📡 Il surveille Firestore en attente de nouveautés...");
console.log("------------------------------------------------");

// ==================================================================
// 1. SURVEILLANCE DES MESSAGES (Collection 'messages')
// ==================================================================
//
// Structure attendue des documents dans 'messages':
// {
//   chatId: string,
//   senderId: string,
//   receiverId: string,
//   text: string,
//   createdAt: number
// }
// ==================================================================

db.collection('messages').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type !== 'added') return;

      const msg = change.doc.data();

      const { chatId, senderId, receiverId, text } = msg;

      if (!receiverId || !senderId || !chatId || !text) {
        console.log('⚠️ Message incomplet, ignoré :', msg);
        return;
      }

      console.log(`💬 Nouveau message détecté pour : ${receiverId}`);
      console.log('Message :', text);

      await sendNotification(receiverId, {
        title: 'Nouveau message',
        body: text,
        type: 'CHAT_MSG',
        sender: senderId,
        content: text
        // from / to ne sont pas nécessaires ici,
        // mais si tu veux les ajouter tu peux mettre:
        // from: senderId,
        // to: receiverId
      });
    });
  },
  (error) => {
    console.error("❌ ERREUR FIRESTORE (messages) :", error);
    if (error.code === 'permission-denied') {
      console.error("👉 Vérifie tes règles de sécurité (Firestore Rules) pour 'messages' !");
    }
  }
);

// ==================================================================
// 2. SURVEILLANCE DES COURSES (Collection 'rides' ou 'trips')
// ==================================================================
//
// ⚠️ Adapter "rides" à ton vrai nom de collection si besoin (peut-être 'trips')
// Structure attendue : { status: 'pending', driverId, from, to, price, ... }
// ==================================================================

db.collection('rides').where('status', '==', 'pending').onSnapshot(
  (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type !== 'added') return;

      const ride = change.doc.data();
      const driverId = ride.driverId;

      if (!driverId) {
        console.log('⚠️ Course sans driverId, ignorée :', ride);
        return;
      }

      console.log(`🚖 Nouvelle course pour le chauffeur : ${driverId}`);

      await sendNotification(driverId, {
        title: 'Nouvelle Course !',
        body: `De ${ride.from} vers ${ride.to}`,
        type: 'NEW_RIDE',
        from: ride.from,
        to: ride.to,
        price: ride.price
      });
    });
  },
  (error) => {
    console.error("❌ ERREUR FIRESTORE (rides) :", error);
    if (error.code === 'permission-denied') {
      console.error("👉 Vérifie tes règles de sécurité (Firestore Rules) pour 'rides' !");
    }
  }
);

// ==================================================================
// 3. FONCTION D'ENVOI DE NOTIFICATION PUSH
// ==================================================================
async function sendNotification(userId, data) {
  try {
    // 1. Récupérer le token du user dans Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      console.log(`❌ User ${userId} introuvable en base.`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(`⚠️ Le user ${userId} n'a pas de token FCM (notifications non activées).`);
      return;
    }

    console.log(`📡 Envoi d'une notif à ${userId} avec le token : ${fcmToken}`);

    // 2. Préparer le message FCM
    const message = {
      token: fcmToken,
      notification: {
        title: data.title || 'Notification',
        body: data.body || ''
      },
      data: {
        type: data.type || '',
        fromUser: data.from || '',
        toUser: data.to || '',
        price: String(data.price || ''),
        sender: data.sender || '',
        content: data.content || ''
      }
    };

    // 3. Envoyer via Firebase Admin
    const response = await messaging.send(message);
    console.log('✅ Notification envoyée avec succès ! ID:', response);

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi :", error);

    // Gestion spéciale : token plus valable
    const code = error.code || error.errorInfo?.code;
    if (code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Token FCM invalide / expiré. On le supprime en base pour forcer la regen côté client.');

      // On supprime le token côté Firestore
      await db.collection('users').doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete()
      });
    }
  }
}
