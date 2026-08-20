import { useEffect } from 'react';

const BASE_TITLE = 'Apos'; // change to your product name

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE;

    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}