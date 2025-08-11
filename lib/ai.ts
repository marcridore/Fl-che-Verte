import OpenAI from 'openai';

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


