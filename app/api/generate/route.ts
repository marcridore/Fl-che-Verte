import { NextResponse } from 'next/server';
import { generateHtmlFromPrompt } from '@/lib/generator';
import { generateHtmlWithOpenAI } from '@/lib/ai';

export async function POST(req: Request) {
  const startedAtMs = Date.now();
  const { prompt, provider } = await req.json();
  const input = String(prompt ?? '');
  const choice = (provider as string) || 'auto'; // 'openai' | 'local' | 'auto'
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const inputPreview = input.slice(0, 200);

  console.log('[api/generate] request', { provider: choice, hasOpenAI, inputPreview });

  // Force OpenAI if requested explicitly
  if (choice === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY not configured',
          provider: 'openai',
          debug: { startedAtMs, tookMs: Date.now() - startedAtMs }
        },
        { status: 400 }
      );
    }
    try {
      const beforeMs = Date.now();
      const aiHtml = await generateHtmlWithOpenAI(input);
      const tookMs = Date.now() - beforeMs;
      console.log('[api/generate] openai success', { tookMs });
      return NextResponse.json({ html: aiHtml, provider: 'openai', debug: { tookMs } });
    } catch (err: any) {
      console.error('[api/generate] openai error', err);
      const status = Number(err?.status) || 500;
      const message = (err?.error?.message || err?.message || 'OpenAI generation failed') as string;
      return NextResponse.json(
        {
          error: message,
          provider: 'openai',
          debug: { status, message, startedAtMs, tookMs: Date.now() - startedAtMs }
        },
        { status }
      );
    }
  }

  // Auto: prefer OpenAI when available, else local
  if (choice === 'auto' && process.env.OPENAI_API_KEY) {
    try {
      const beforeMs = Date.now();
      const aiHtml = await generateHtmlWithOpenAI(input);
      const tookMs = Date.now() - beforeMs;
      console.log('[api/generate] auto→openai success', { tookMs });
      return NextResponse.json({ html: aiHtml, provider: 'openai', debug: { tookMs } });
    } catch (err) {
      console.warn('[api/generate] auto openai failed, falling back to local', err);
    }
  }

  // Local fallback or explicit local
  const localHtml = generateHtmlFromPrompt(input);
  const tookMs = Date.now() - startedAtMs;
  console.log('[api/generate] local success', { tookMs });
  return NextResponse.json({ html: localHtml, provider: 'local', debug: { tookMs } });
}


