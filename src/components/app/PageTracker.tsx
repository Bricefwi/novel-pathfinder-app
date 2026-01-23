import { usePageTracking } from '@/hooks/use-page-tracking';

/**
 * Composant wrapper pour activer le tracking de pages.
 * Doit être placé à l'intérieur du BrowserRouter.
 */
export const PageTracker = () => {
  usePageTracking();
  return null;
};
