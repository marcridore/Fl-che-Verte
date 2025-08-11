'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';

const MonacoEditor = dynamic(() => import('@/components/MonacoEditor'), { ssr: false });
const Preview = dynamic(() => import('@/components/Preview'), { ssr: false });

export default function HomeClient() {
  const [prompt, setPrompt] = useState<string>('sleek saas landing with gradient hero, 3 features, testimonial, and a call-to-action');
  const [html, setHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [provider, setProvider] = useState<'auto' | 'openai' | 'local'>('auto');
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [refine, setRefine] = useState<string>('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('Untitled');
  const [showProjects, setShowProjects] = useState<boolean>(false);
  const [projects, setProjects] = useState<Array<{ id: string; title: string; updatedAt: number }>>([]);
  // localStorage helpers so saving survives dev server reloads
  const localSaveProject = useCallback((id: string, title: string, htmlContent: string) => {
    const key = 'vibecode_projects_v1';
    const arr: any[] = JSON.parse(localStorage.getItem(key) || '[]');
    const existingIdx = arr.findIndex((p) => p.id === id);
    const record = { id, title, html: htmlContent, updatedAt: Date.now() };
    if (existingIdx >= 0) arr[existingIdx] = { ...arr[existingIdx], ...record };
    else arr.push(record);
    localStorage.setItem(key, JSON.stringify(arr));
  }, []);

  const localListProjects = useCallback(() => {
    const key = 'vibecode_projects_v1';
    const arr: any[] = JSON.parse(localStorage.getItem(key) || '[]');
    return arr as Array<{ id: string; title: string; html?: string; updatedAt: number }>;
  }, []);

  const localGetProject = useCallback((id: string) => {
    return localListProjects().find((p) => p.id === id);
  }, [localListProjects]);

  useEffect(() => {
    // Initial generation via API (falls back to local on server)
    (async () => {
      try {
        // Ensure a project exists first
        let id = projectId;
        if (!id) {
          const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Untitled' }) });
          const pj = await r.json();
          id = String(pj?.project?.id ?? '');
          setProjectId(id);
          if (pj?.project?.title) setProjectTitle(String(pj.project.title));
        }
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider })
        });
        const data = await res.json();
        setLastProvider(typeof data.provider === 'string' ? data.provider : null);
        setDebugInfo(data.debug ?? null);
        const newHtml = String(data.html ?? '');
        setHtml(newHtml);
        // Autosave generated HTML to the project so Load will work immediately
        if (id) {
          await fetch(`/api/projects/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: newHtml, title: projectTitle }) });
          localSaveProject(id, projectTitle || 'Untitled', newHtml);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [provider]);

  const onGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, provider })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLastProvider(typeof err.provider === 'string' ? err.provider : null);
        setDebugInfo(err.debug ?? null);
        throw new Error(err?.error || `Generation failed (${res.status})`);
      }
      const data = await res.json();
      setLastProvider(typeof data.provider === 'string' ? data.provider : null);
      setDebugInfo(data.debug ?? null);
      const newHtml = String(data.html ?? '');
      setHtml(newHtml);
      if (projectId) {
        await fetch(`/api/projects/${projectId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: newHtml, title: projectTitle }) });
        localSaveProject(projectId, projectTitle || 'Untitled', newHtml);
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const onDownload = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vibecode-site.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [html]);

  const onRefine = useCallback(async () => {
    if (!refine.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, instruction: refine, provider })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setLastProvider(typeof err.provider === 'string' ? err.provider : null);
        setDebugInfo(err.debug ?? null);
        throw new Error(err?.error || `Edit failed (${res.status})`);
      }
      const data = await res.json();
      setLastProvider(typeof data.provider === 'string' ? data.provider : null);
      setDebugInfo(data.debug ?? null);
      const newHtml = String(data.html ?? '');
      setHtml(newHtml);
      if (projectId) {
        await fetch(`/api/projects/${projectId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html: newHtml, title: projectTitle }) });
        localSaveProject(projectId, projectTitle || 'Untitled', newHtml);
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [refine, html, provider]);

  const onOpen = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [html]);

  const onCopy = useCallback(async () => {
    await navigator.clipboard.writeText(html);
  }, [html]);

  // List projects (server + local) — defined before onSave to avoid TDZ
  const refreshProjects = useCallback(async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    const serverList: Array<{ id: string; title: string; updatedAt: number }> = Array.isArray(data.projects) ? data.projects : [];
    const localList = localListProjects().map((p) => ({ id: p.id, title: p.title || 'Untitled', updatedAt: p.updatedAt }));
    const merged = new Map<string, { id: string; title: string; updatedAt: number }>();
    [...serverList, ...localList].forEach((p) => merged.set(p.id, p));
    const sorted = Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    setProjects(sorted);
  }, [localListProjects]);

  const onSave = useCallback(async () => {
    if (!projectId) return;
    const name = window.prompt('Project name', projectTitle || 'Untitled');
    const finalTitle = name === null ? projectTitle : (name.trim() || 'Untitled');
    setProjectTitle(finalTitle);
    await fetch(`/api/projects/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, title: finalTitle })
    });
    localSaveProject(projectId, finalTitle, html);
    await refreshProjects();
  }, [projectId, html, projectTitle, refreshProjects]);

  const onLoad = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.project?.html !== undefined) {
        setHtml(String(data.project.html));
        return;
      }
    }
    // Fallback to local cache if server lost memory (dev reload)
    const local = localGetProject(projectId);
    if (local?.html !== undefined) setHtml(String(local.html));
  }, [projectId]);

  

  const onNewProject = useCallback(async () => {
    // Offer to save current project first
    if (projectId) {
      const shouldSave = window.confirm('Save current project before creating a new one?');
      if (shouldSave) {
        await onSave();
      }
    }
    const name = window.prompt('Name for new project', 'Untitled') || 'Untitled';
    const r = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: name }) });
    const pj = await r.json();
    const id = String(pj?.project?.id ?? '');
    setProjectId(id);
    setProjectTitle(name);
    setHtml('');
    setShowProjects(false);
    localSaveProject(id, name, '');
    await refreshProjects();
  }, [projectId, onSave, refreshProjects]);

  const onSwitchProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.project) {
        setProjectId(String(data.project.id));
        setHtml(String(data.project.html || ''));
        if (data.project.title) setProjectTitle(String(data.project.title));
        setShowProjects(false);
        return;
      }
    }
    const local = localGetProject(id);
    if (local) {
      setProjectId(local.id);
      setHtml(String(local.html || ''));
      if (local.title) setProjectTitle(String(local.title));
      setShowProjects(false);
    }
  }, [localGetProject]);

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">VibeCode</h1>
            <p className="text-sm text-neutral-400">Describe the vibe, get a website. Edit the code live and preview instantly.</p>
            {projectId && (
              <p className="text-[11px] text-neutral-500">Project: <span className="text-neutral-300">{projectTitle}</span> <span className="text-neutral-600">({projectId})</span></p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={async ()=>{ setShowProjects((v)=>!v); if (!showProjects) await refreshProjects(); }} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Projects</button>
            <button
              onClick={onGenerate}
              className={clsx(
                'inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15',
                isGenerating && 'opacity-70 cursor-not-allowed'
              )}
              disabled={isGenerating}
            >
              {isGenerating ? 'Vibing…' : 'VibeCode'}
            </button>
            <button onClick={onSave} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Save</button>
            <button onClick={onLoad} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Load</button>
            <button onClick={onDownload} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Download</button>
            <button onClick={onOpen} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Open</button>
            <button onClick={onCopy} className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5">Copy HTML</button>
          </div>
        </header>

        <section className="space-y-3">
          <label htmlFor="prompt" className="block text-sm text-neutral-300">Vibe prompt</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <textarea
              id="prompt"
              className="flex-1 rounded-md border border-white/10 bg-white/5 p-3 text-sm outline-none placeholder:text-neutral-500"
              rows={3}
              placeholder="e.g. playful portfolio with pastel colors, masonry gallery, and contact form"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={onGenerate}
              className={clsx(
                'shrink-0 rounded-md bg-indigo-500 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-400',
                isGenerating && 'opacity-70 cursor-not-allowed'
              )}
              disabled={isGenerating}
            >
              {isGenerating ? 'Vibing…' : 'Generate'}
            </button>
          </div>
          {lastProvider && (
            <div className="text-xs text-neutral-400">Used provider: <span className="text-neutral-200">{lastProvider}</span></div>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showDebug} onChange={(e)=>setShowDebug(e.target.checked)} />
              <span>Show debug</span>
            </label>
            {showDebug && debugInfo && (
              <pre className="w-full overflow-auto rounded-md border border-white/10 bg-black/40 p-3 text-[11px] text-neutral-300">{JSON.stringify(debugInfo, null, 2)}</pre>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span>Provider:</span>
            <label className="flex items-center gap-1">
              <input type="radio" name="provider" value="auto" checked={provider==='auto'} onChange={() => setProvider('auto')} />
              <span>Auto</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="provider" value="openai" checked={provider==='openai'} onChange={() => setProvider('openai')} />
              <span>OpenAI</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="provider" value="local" checked={provider==='local'} onChange={() => setProvider('local')} />
              <span>Local</span>
            </label>
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-sm text-neutral-300">Refine (edit just a part)</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-neutral-500"
                placeholder="e.g. make paragraph text darker and increase size in the hero"
                value={refine}
                onChange={(e)=>setRefine(e.target.value)}
              />
              <button onClick={onRefine} className="shrink-0 rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Apply edit</button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {showProjects && (
            <div className="lg:col-span-2 rounded-lg border border-white/10 bg-black/40 p-4 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">Projects</div>
                <div className="flex gap-2">
                  <button onClick={refreshProjects} className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5">Refresh</button>
                  <button onClick={onNewProject} className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5">New</button>
                </div>
              </div>
              <div className="max-h-48 overflow-auto divide-y divide-white/10">
                {projects.length === 0 && <div className="py-2 text-neutral-400">No projects yet</div>}
                {projects.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="truncate">
                      <div className="truncate">{p.title || 'Untitled'}</div>
                      <div className="text-xs text-neutral-500">{p.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>onSwitchProject(p.id)} className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/5">Load</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="h-[70vh] lg:h-[78vh]">
            <MonacoEditor value={html} onChange={setHtml} />
          </div>
          <div className="h-[70vh] lg:h-[78vh] rounded-lg border border-white/10 bg-black/30">
            <Preview html={html} />
          </div>
        </section>
      </div>
    </main>
  );
}


