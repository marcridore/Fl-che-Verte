'use client';

import dynamic from 'next/dynamic';

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export default function MonacoEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="h-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <Monaco
        height="100%"
        defaultLanguage="html"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          wordWrap: 'on',
          scrollBeyondLastLine: false
        }}
      />
    </div>
  );
}


