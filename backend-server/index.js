const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Assurez-vous d'avoir votre clé privée ici
const serviceAccount = require('../serviceAccountKey.json');

// Initialisation de Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();
const messaging = admin.messaging();

console.log(`🧾 serviceAccount project_id = ${serviceAccount.project_id}`);
console.log("Tentative de connexion à Firestore...");
console.log("------------------------------------------------");
console.log("👀 LE ROBOT EST EN LIGNE !");
console.log("📡 Il surveille Firestore en attente de nouveautés...");
console.log("------------------------------------------------");

// Variable pour ignorer les messages déjà présents au démarrage du script
let isFirstRun = true;

// Écoute en temps réel de la collection 'messages'
db.collection('messages').onSnapshot(snapshot => {
  
  // Au premier chargement, on marque juste le flag à false pour ne pas spammer
  if (isFirstRun) {
    isFirstRun = false;
    return;
  }

  snapshot.docChanges().forEach(async (change) => {
    // On ne réagit qu'aux AJOUTS de documents (nouveaux messages)
    if (change.type === 'added') {
      const msgData = change.doc.data();
      const receiverId = msgData.receiverId;
      const text = msgData.text;

      // Vérifications de base
      if (!receiverId || !text) return;

      console.log(`💬 Nouveau message détecté pour : ${receiverId}`);
      console.log(`Message : ${text}`);

      // 1. Récupérer le token du destinataire dans Firestore
      const userRef = db.collection('users').doc(receiverId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log(`⚠️ Utilisateur ${receiverId} introuvable en base.`);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.log(`⚠️ Pas de token FCM pour ${userData.displayName || userData.email}. Notification ignorée.`);
        return;
      }

      console.log(`📡 Envoi d'une notif à ${receiverId} avec le token : ${fcmToken}`);

      // 2. Envoyer la notification via FCM
      await sendNotification(fcmToken, text, receiverId, userRef);
    }
  });
}, error => {
  console.error("❌ Erreur critique du listener Firestore:", error);
});

/**
 * Envoie la notification et gère le nettoyage des tokens invalides
 */
async function sendNotification(token, text, userId, userRef) {
  const message = {
    notification: {
      title: 'Nouveau message',
      body: text
    },
    token: token
  };

  try {
    const response = await messaging.send(message);
    console.log(`✅ Notification envoyée avec succès ! ID: ${response}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi :', error);

    // --- C'EST ICI QUE SE FAIT LA RÉPARATION ---
    // Si l'erreur indique que le token n'existe plus (ex: cache vidé, désinstallé, etc.)
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-argument') {
        
        console.log(`⚠️ Token FCM invalide / expiré. On le supprime en base pour forcer la regen côté client.`);
        
        try {
            // On supprime le champ fcmToken du document utilisateur
            await userRef.update({
                fcmToken: FieldValue.delete()
            });
            console.log(`🗑️ Token supprimé de la base pour l'utilisateur ${userId}.`);
        } catch (dbError) {
            console.error("❌ Impossible de supprimer le token en base:", dbError);
        }
    }
  }
}