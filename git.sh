#!/bin/bash

echo "-----------------------------------------------------------"
echo "🔧 Patch : Suppression automatique des messages après push"
echo "-----------------------------------------------------------"

FILE="backend-server/index.js"

# Vérifier si le fichier existe
if [ ! -f "$FILE" ]; then
  echo "❌ ERREUR : Fichier introuvable : $FILE"
  exit 1
fi

# Sauvegarde
cp "$FILE" "${FILE}.bak"
echo "📦 Sauvegarde créée : index.js.bak"

# Supprime l'ancien bloc sendNotification si déjà patché
sed -i '' '/function sendNotification/,/}/d' "$FILE"

# Ajout du nouveau bloc sendNotification à la fin du fichier
cat << 'EOF' >> "$FILE"

//
// ==================================================================
// 🆕 VERSION PATCHÉE : ENVOI + SUPPRESSION DU MESSAGE FIRESTORE
// ==================================================================
//

async function sendNotification(userId, data, messageId = null) {
  try {
    // 1. Récupérer token user
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(\`❌ User \${userId} introuvable en base.\`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
      console.log(\`⚠️ Le user \${userId} n'a pas de token FCM.\`);
      return;
    }

    console.log(\`📡 Envoi d'une notif à \${userId} avec token : \${fcmToken}\`);

    // 2. Envoi push
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

    const response = await messaging.send(message);
    console.log('✅ Notification envoyée ! ID:', response);

    // 3. 🔥 SUPPRESSION DU MESSAGE FIRESTORE APRÈS PUSH
    if (messageId) {
      await db.collection('messages').doc(messageId).delete();
      console.log('🗑 Message Firestore supprimé :', messageId);
    }

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi :", error);

    // token expiré → suppression côté user
    const code = error.code || error.errorInfo?.code;
    if (code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Token expiré → suppression du token Firestore');
      await db.collection('users').doc(userId).update({
        fcmToken: admin.firestore.FieldValue.delete()
      });
    }
  }
}

EOF

echo "-----------------------------------------------------------"
echo "🎉 Patch appliqué avec succès !"
echo "👉 Pense à relancer ton serveur Node : node index.js"
echo "-----------------------------------------------------------"
