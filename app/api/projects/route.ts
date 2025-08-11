import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// POST /api/projects -> create
export async function POST(req: Request) {
  const { title, html } = await req.json().catch(() => ({}));
  const p = store.createProject({ title, html });
  return NextResponse.json({ project: p });
}

// GET /api/projects -> list
export async function GET() {
  const items = store.listProjects();
  return NextResponse.json({ projects: items });
}


