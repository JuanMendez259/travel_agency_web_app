import { useEffect } from "react";

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title;
    if (title) document.title = `${title} · Proxima Parada Tours`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
