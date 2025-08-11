import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

type Ctx = { params: { id: string } };

// GET /api/projects/:id
export async function GET(_req: Request, ctx: Ctx) {
  const p = store.getProject(ctx.params.id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: p });
}

// POST /api/projects/:id/save { html, title? }
export async function POST(req: Request, ctx: Ctx) {
  const { html, title } = await req.json();
  const p = store.saveProject(ctx.params.id, String(html ?? ''), title);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ project: p });
}


