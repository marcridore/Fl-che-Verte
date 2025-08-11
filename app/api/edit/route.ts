import { NextResponse } from 'next/server';
import { applyEditsToHtml, type HtmlEdit } from '@/lib/htmlEdit';
import { proposeHtmlEditsWithOpenAI } from '@/lib/ai';

export async function POST(req: Request) {
  const startedAtMs = Date.now();
  const { html, instruction, provider } = await req.json();
  const choice = (provider as string) || 'auto'; // openai | local | auto

  try {
    if (choice === 'openai' || (choice === 'auto' && process.env.OPENAI_API_KEY)) {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OPENAI_API_KEY not configured', provider: 'openai' }, { status: 400 });
      }
      const before = Date.now();
      const { edits, notes } = await proposeHtmlEditsWithOpenAI(String(html ?? ''), String(instruction ?? ''));
      const updated = applyEditsToHtml(String(html ?? ''), edits as HtmlEdit[]);
      return NextResponse.json({ html: updated, provider: 'openai', debug: { tookMs: Date.now() - before, editCount: edits.length, notes } });
    }
  } catch (err: any) {
    const status = Number(err?.status) || 500;
    return NextResponse.json({ error: String(err?.message || err), provider: 'openai' }, { status });
  }

  // Local: no model, so just echo back unchanged for now
  return NextResponse.json({ html, provider: 'local', debug: { tookMs: Date.now() - startedAtMs, editCount: 0 } });
}


