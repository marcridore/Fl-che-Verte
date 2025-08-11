import * as cheerio from 'cheerio';

export type EditTarget =
  | { by: 'id'; value: string }
  | { by: 'selector'; value: string };

export type HtmlEdit = {
  target: EditTarget;
  html: string; // full replacement for the target element
};

export function applyEditsToHtml(originalHtml: string, edits: HtmlEdit[]): string {
  const $ = cheerio.load(originalHtml, { xmlMode: false, decodeEntities: false });

  for (const edit of edits) {
    try {
      if (edit.target.by === 'id') {
        const el = $(`#${CSS.escape(edit.target.value)}`);
        if (el.length > 0) {
          el.replaceWith(edit.html);
        }
      } else if (edit.target.by === 'selector') {
        const el = $(edit.target.value).first();
        if (el.length > 0) {
          el.replaceWith(edit.html);
        }
      }
    } catch (e) {
      // ignore faulty edits to keep document valid
      // eslint-disable-next-line no-console
      console.warn('[applyEditsToHtml] failed edit', edit, e);
    }
  }

  return $.root().html() || originalHtml;
}


