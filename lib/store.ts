export type ProjectRecord = {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
};

class InMemoryStore {
  private projects: Map<string, ProjectRecord> = new Map();

  createProject(params?: { title?: string; html?: string }): ProjectRecord {
    const id = Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    const record: ProjectRecord = {
      id,
      title: params?.title || 'Untitled',
      html: params?.html || '',
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, record);
    return record;
  }

  getProject(id: string): ProjectRecord | undefined {
    return this.projects.get(id);
  }

  saveProject(id: string, html: string, title?: string): ProjectRecord | undefined {
    const existing = this.projects.get(id);
    if (!existing) return undefined;
    const updated: ProjectRecord = {
      ...existing,
      html,
      title: title ?? existing.title,
      updatedAt: Date.now()
    };
    this.projects.set(id, updated);
    return updated;
  }

  listProjects(): ProjectRecord[] {
    return Array.from(this.projects.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50);
  }
}

export const store = new InMemoryStore();


