const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialisation
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deleteAllUsers(nextPageToken) {
  // 1. Récupérer la liste des utilisateurs (par lot de 1000)
  const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
  
  const uids = listUsersResult.users.map((user) => user.uid);

  if (uids.length === 0) {
    console.log('✅ Aucun utilisateur à supprimer.');
    return;
  }

  // 2. Supprimer les utilisateurs trouvés
  console.log(`Suppression de ${uids.length} utilisateurs en cours...`);
  await admin.auth().deleteUsers(uids);
  
  console.log(`✅ ${uids.length} utilisateurs supprimés.`);

  // 3. Continuer s'il en reste d'autres
  if (listUsersResult.pageToken) {
    await deleteAllUsers(listUsersResult.pageToken);
  }
}

// Lancer le script
deleteAllUsers()
  .then(() => {
    console.log('🎉 Terminé ! La base Auth est vide.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });