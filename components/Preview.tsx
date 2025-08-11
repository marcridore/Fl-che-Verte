'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function Preview({ html }: { html: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    const oldUrl = prevUrl.current;
    prevUrl.current = nextUrl;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    };
  }, [html]);

  return (
    <iframe
      className="h-full w-full rounded-lg"
      src={url ?? undefined}
      sandbox="allow-forms allow-scripts allow-popups allow-modals allow-downloads allow-presentation"
      title="VibeCode Preview"
    />
  );
}


