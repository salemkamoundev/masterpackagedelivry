const admin = require('firebase-admin');
const path = require('path');

// ⚠️ CHARGEMENT DE LA CLÉ TÉLÉCHARGÉE
// Le fichier doit être à la racine du projet Angular (un dossier au-dessus)
const serviceAccount = require('../serviceAccountKey.json');
const { log } = require('console');

// Initialisation Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
console.log("Tentative de connexion à Firestore...");

db.collection('messages').onSnapshot(
  (snapshot) => {
    // Cas 1 : Connexion réussie, mais pas de données
    if (snapshot.empty) {
      console.warn("⚠️ La collection 'messages' est VIDE ou n'existe pas dans Firestore.");
      return;
    }

    // Cas 2 : Données trouvées
    console.log("✅ J'ai trouvé " + snapshot.size + " messages !");
    snapshot.forEach(doc => {
      console.log("Message ID:", doc.id, "Data:", doc.data());
    });
  },
  (error) => {
    // Cas 3 : Erreur (souvent les permissions)
    console.error("❌ ERREUR FIRESTORE :", error);
    if (error.code === 'permission-denied') {
      console.error("👉 Vérifie tes règles de sécurité (Firestore Rules) !");
    }
  }
);
console.log("------------------------------------------------");
console.log("👀 LE ROBOT EST EN LIGNE !");
console.log("📡 Il surveille Firestore en attente de nouveautés...");
console.log("------------------------------------------------");

// ==================================================================
// 1. SURVEILLANCE DES MESSAGES (Collection 'messages')
// ==================================================================
// On suppose que vous créez un document dans 'messages' pour chaque chat
db.collection('messages').onSnapshot(snapshot => {
  console.log(" dsqf iusdf èdç!èdgà!dfsçdsuàçg!j gs pçfj")
  snapshot.docChanges().forEach(async change => {
    if (change.type === 'added') {
      const msg = change.doc.data();
      
      // On ignore les vieux messages (ceux déjà traités ou trop vieux)
      // Astuce: Ajoutez un champ 'timestamp' et comparez-le, ou un champ 'processed'
      // Pour ce test simple, on envoie tout ce qui arrive en temps réel.
      
      const targetUserId = msg.receiverId; // L'ID de celui qui doit recevoir
      if (!targetUserId) return;

      console.log(`💬 Nouveau message détecté pour : ${targetUserId}`);
      console.log("111111111")
      await sendNotification(targetUserId, {
        title: `Message de ${msg.senderName || 'Inconnu'}`,
        body: msg.content || 'Nouveau message reçu',
        type: 'CHAT_MSG',
        sender: msg.senderName,
        content: msg.content
      });
      console.log("dsfsdf")
    }
  });
});

// ==================================================================
// 2. SURVEILLANCE DES COURSES (Collection 'rides')
// ==================================================================
db.collection('rides').where('status', '==', 'pending').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(async change => {
    if (change.type === 'added') {
      const ride = change.doc.data();
      const driverId = ride.driverId; // L'ID du chauffeur assigné

      if (!driverId) return;

      console.log(`🚖 Nouvelle course pour le chauffeur : ${driverId}`);

      await sendNotification(driverId, {
        title: 'Nouvelle Course !',
        body: `De ${ride.from} vers ${ride.to}`,
        type: 'NEW_RIDE',
        from: ride.from,
        to: ride.to,
        price: ride.price
      });
    }
  });
});

// ==================================================================
// FONCTION D'ENVOI (HÉROS DE L'HISTOIRE)
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
      console.log(`⚠️ Le user ${userId} n'a pas de token FCM (Notifications non activées).`);
      return;
    }

    // 2. Préparer le message
    const message = {
      token: fcmToken,
      notification: {
        title: data.title,
        body: data.body
      },
      data: {
        type: data.type,
        // Firebase data doit être des strings
        from: data.from || '',
        to: data.to || '',
        price: String(data.price || ''),
        sender: data.sender || '',
        content: data.content || ''
      }
    };

    // 3. Envoyer via Firebase Admin (GRATUIT)
    const response = await messaging.send(message);
    console.log('✅ Notification envoyée avec succès ! ID:', response);

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi :', error);
  }
}
