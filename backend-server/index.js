const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// ⚠️ Assurez-vous que ce fichier existe bien dans le dossier backend-server
const serviceAccount = require('../serviceAccountKey.json');

// Initialisation unique
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();
const messaging = admin.messaging();

console.log("------------------------------------------------");
console.log(`🚀 SERVEUR DE NOTIFICATIONS DÉMARRÉ`);
console.log(`🧾 Projet ID : ${serviceAccount.project_id}`);
console.log("📡 Surveillance active sur : ['messages', 'notifications']");
console.log("------------------------------------------------");

// Variable pour éviter d'envoyer des notifs pour les anciennes données au démarrage
let isFirstRun = true;

// ============================================================
// 1. SURVEILLANCE DES NOTIFICATIONS SYSTÈME (Trajets, Alertes...)
// ============================================================
// C'est ici que l'alerte "Ajout au Trajet" est détectée
db.collection('notifications').onSnapshot(snapshot => {
  if (isFirstRun) {
    isFirstRun = false;
    return;
  }

  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      
      // data.userId = Le chauffeur destinataire
      // data.message = "Mise à jour : Ajout de 1 Colis..."
      // data.type = 'INFO', 'ALERT', etc.
      
      if (data.userId && data.message) {
        console.log(`🔔 Nouvelle notification système détectée pour : ${data.userId}`);
        await processNotification(data.userId, 'Information Trajet', data.message);
      }
    }
  });
}, error => console.error("❌ Erreur Listener Notifications:", error));


// ============================================================
// 2. SURVEILLANCE DU CHAT (Messagerie)
// ============================================================
db.collection('messages').onSnapshot(snapshot => {
  if (isFirstRun) return;

  snapshot.docChanges().forEach(async (change) => {
    if (change.type === 'added') {
      const data = change.doc.data();
      
      // data.receiverId = Le destinataire
      // data.text = Le contenu du message
      
      if (data.receiverId && data.text) {
        console.log(`💬 Nouveau chat détecté pour : ${data.receiverId}`);
        await processNotification(data.receiverId, 'Nouveau message', data.text);
      }
    }
  });
}, error => console.error("❌ Erreur Listener Chat:", error));


// ============================================================
// FONCTION D'ENVOI (Commune)
// ============================================================
async function processNotification(userId, title, body) {
  try {
    // 1. Récupérer le token FCM de l'utilisateur dans Firestore
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log(`⚠️ Utilisateur ${userId} introuvable en base.`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(`🔕 L'utilisateur ${userData.displayName || userId} n'a pas de token FCM (Notifications bloquées ou non autorisées).`);
      return;
    }

    // 2. Construire le message Push
    const message = {
      notification: {
        title: title,
        body: body
      },
      token: fcmToken
    };

    // 3. Envoyer via Firebase Messaging
    const response = await messaging.send(message);
    console.log(`✅ Push envoyé avec succès ! (ID: ${response})`);

  } catch (error) {
    console.error('❌ Échec de l\'envoi :', error.code || error.message);

    // 4. Nettoyage automatique des tokens invalides
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-argument') {
        console.log(`🗑️ Token périmé détecté pour ${userId}. Suppression de la base pour forcer le rafraîchissement.`);
        await db.collection('users').doc(userId).update({
            fcmToken: FieldValue.delete()
        });
    }
  }
}