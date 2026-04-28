import { useEffect } from 'react';

export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (title) {
      document.title = title;
    }
    return () => {
      document.title = 'request-bucket';
    };
  }, [title]);
}
