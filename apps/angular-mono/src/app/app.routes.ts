import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'users',
    loadChildren: () =>
      import('@angular-mono/users-feature-users').then(
        (m) => m.USERS_FEATURE_ROUTES,
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'users',
  },
  {
    path: '**',
    redirectTo: 'users',
  },
];
