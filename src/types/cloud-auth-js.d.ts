// Fix de typage pour @lovable.dev/cloud-auth-js
// Le fichier src/integrations/lovable/* est auto-généré : on évite de le modifier.

declare module "@lovable.dev/cloud-auth-js" {
  // Rendre l'argument optionnel pour compatibilité avec le code généré
  export function createLovableAuth(opts?: any): any;
}
