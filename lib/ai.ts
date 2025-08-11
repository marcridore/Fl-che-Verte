import OpenAI from 'openai';
import type { HtmlEdit } from '@/lib/htmlEdit';

function extractHtmlFromText(text: string): string {
  const codeFenceMatch = text.match(/```(?:html)?\n([\s\S]*?)```/i);
  if (codeFenceMatch) return codeFenceMatch[1].trim();
  // If the model returns raw HTML without fences
  return text.trim();
}

export async function generateHtmlWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const client = new OpenAI({ apiKey });

  const system = `You are an expert frontend generator. Produce a single self-contained HTML5 document.
- Use Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>)
- Include <head> with <meta viewport>, a title, and an optional Google Font link
- Compose sections based on the user's vibe prompt
- Avoid external images; use gradients/placeholders instead
- No server-side code. Keep JS inline if needed.
- The output MUST be one HTML file. Do not include explanations.`;

  const user = `Vibe prompt: ${prompt}\n\nGenerate the complete HTML file.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  const content = response.choices?.[0]?.message?.content ?? '';
  return extractHtmlFromText(content);
}

export async function proposeHtmlEditsWithOpenAI(currentHtml: string, instruction: string): Promise<{ edits: HtmlEdit[]; notes?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const client = new OpenAI({ apiKey });

  const sys = `You are an HTML refactoring agent. Return JSON with precise edits only.
Schema:
{
  "edits": [
    { "target": { "by": "id" | "selector", "value": string }, "html": string }
  ],
  "notes": string
}
Rules:
- Only include elements that need replacing. Keep IDs stable when possible.
- The html field must contain a complete replacement element (e.g., <section id=...>...)</n+- Do not include explanations outside JSON.`;

  const userMsg = `Instruction: ${instruction}\n\nCurrent HTML (truncated to 40k chars):\n${currentHtml.slice(0, 40000)}`;

  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: userMsg }
    ]
  });

  const json = resp.choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(json) as { edits?: HtmlEdit[]; notes?: string };
    return { edits: parsed.edits || [], notes: parsed.notes };
  } catch (e) {
    return { edits: [], notes: 'Failed to parse model JSON' };
  }
}


