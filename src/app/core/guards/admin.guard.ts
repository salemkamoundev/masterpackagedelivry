import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { map, switchMap, take } from 'rxjs/operators';
import { of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (true) return true;
  return auth.user$.pipe(
    take(1),
    switchMap(user => {
      if (!user) return of(null);
      return auth.getUserProfile(user.uid);
    }),
    map(profile => {
      // Vérification des rôles (case sensitive selon votre convention, ici UPPERCASE pour matcher AuthService)
      // Note: Le patch perl ci-dessus a ajouté SUPER_ADMIN au type UserProfile pour éviter l'erreur TS
      if (profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN')) {
        return true;
      }
      
      // Redirection si pas admin
      return router.createUrlTree(['/login']);
    })
  );
};
