#!/bin/bash

FILE="src/app/features/admin/trips/trip-manager.component.ts"

echo "--- 🧠 CORRECTION : NOTIFICATION INTELLIGENTE ---"

# On remplace saveAllExtras par une version qui trouve le chauffeur via le profil enrichi
cat > temp_save_extras.ts << 'EOF'
  async saveAllExtras() {
    // On force le typage en 'any' pour accéder aux propriétés enrichies (driverProfile)
    const trip = this.selectedTripForRequest as any;
    
    if (!trip || !trip.uid) {
        console.error("❌ Erreur : Pas de trajet sélectionné");
        return;
    }

    if (this.tempParcels.length === 0 && this.tempPassengers.length === 0) {
        alert("Aucun élément à ajouter.");
        return;
    }

    try {
        // 1. Déterminer le VRAI destinataire de la notif
        // On regarde d'abord le driverId du trajet, sinon on prend celui du profil enrichi (via le véhicule)
        let targetDriverId = trip.driverId;
        
        if ((!targetDriverId || targetDriverId === 'PENDING') && trip.driverProfile) {
            targetDriverId = trip.driverProfile.uid;
            console.log("💡 Chauffeur trouvé via le véhicule :", targetDriverId);
        }

        const updates: any = {};
        
        if (this.tempParcels.length > 0) {
            updates.parcels = [...(trip.parcels || []), ...this.tempParcels];
        }
        if (this.tempPassengers.length > 0) {
            updates.passengers = [...(trip.passengers || []), ...this.tempPassengers];
        }
        
        updates.hasNewItems = true;
        
        // Si on a trouvé un chauffeur via le véhicule mais que le trajet était PENDING, 
        // on assigne officiellement le chauffeur au trajet maintenant !
        if (targetDriverId && targetDriverId !== 'PENDING' && trip.driverId === 'PENDING') {
            updates.driverId = targetDriverId;
            updates.status = 'IN_PROGRESS'; // On passe en cours car un chauffeur est là
        }

        console.log("💾 Mise à jour Firestore...", updates);
        await this.tripService.updateTrip(trip.uid, updates);

        // 2. Envoi de la Notification
        if (targetDriverId && targetDriverId !== 'PENDING') {
            const countP = this.tempParcels.length;
            const countPass = this.tempPassengers.length;
            
            let details = [];
            if (countP > 0) details.push(`${countP} Colis`);
            if (countPass > 0) details.push(`${countPass} Passager(s)`);
            
            const msg = `Mise à jour : Ajout de ${details.join(' et ')} pour ${trip.destination}.`;
            
            console.log(`🚀 Envoi de la notification à ${targetDriverId} : ${msg}`);
            await this.notifService.send(targetDriverId, msg, 'INFO');
        } else {
            console.warn("⚠️ Impossible de trouver un chauffeur à notifier (Pas de driverId ni de driverProfile)");
        }

        alert("Modifications enregistrées !");
        this.closeRequestModal();
        
    } catch (e) {
        console.error(e);
        alert("Erreur technique : " + e);
    }
  }
EOF

# Injection du code
perl -i -0777 -pe 'BEGIN{local $/; open(F,"<temp_save_extras.ts"); $code=<F>; close(F);} s/async saveAllExtras\(\) \{.*?\n  \}/$code/s' "$FILE"

rm temp_save_extras.ts

echo "✅ Logique de notification corrigée : Le chauffeur lié au véhicule sera maintenant notifié."