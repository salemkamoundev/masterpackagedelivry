#!/bin/bash
echo "-----------------------------------------------------------"
echo "🔧 Patch Notifications - ChatService + receiverId + Firestore"
echo "-----------------------------------------------------------"

FILE="src/app/core/services/chat.service.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ Fichier introuvable : $FILE"
  exit 1
fi

# Sauvegarde
cp "$FILE" "${FILE}.bak"
echo "📦 Sauvegarde créée : chat.service.ts.bak"

# Réécriture complète de sendMessage()
sed -i "" '/async sendMessage/,/getMessages/{
/async sendMessage/,/}/d
}' "$FILE"

cat << 'EOF' >> "$FILE"

  // ------------------------------
  // Nouveau sendMessage corrigé
  // ------------------------------
  async sendMessage(chatId: string, senderId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. ➜ Sauvegarde RTDB (affichage live du chat)
    const messagesRef = ref(this.db, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      senderId,
      text: trimmed,
      createdAt: Date.now()
    });

    // 2. ➜ Déterminer receiverId automatiquement
    const [u1, u2] = chatId.split('_');
    const receiverId = senderId === u1 ? u2 : u1;

    // 3. ➜ Sauvegarde Firestore (pour le robot de notifications)
    await addDoc(collection(this.firestore, 'messages'), {
      chatId,
      senderId,
      receiverId,
      text: trimmed,
      createdAt: Date.now()
    });

    // 4. ➜ Notification interne "in-app"
    try {
      await this.notifService.send(
        receiverId,
        `Nouveau message : ${trimmed.substring(0, 50)}`
      );
    } catch (e) {
      console.error("Erreur lors de l'envoi de la notification in-app :", e);
    }
  }
EOF

echo "✅ Patch appliqué correctement."
echo "👉 Vérifie maintenant que ton script Node reçoit bien receiverId"
echo "👉 N'oublie pas de relancer : ng serve"
echo "-----------------------------------------------------------"
