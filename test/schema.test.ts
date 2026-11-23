import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TiptapTransformer } from '@hocuspocus/transformer';
import { FRAGMENT_NAME, serverExtensions } from '../src/config/index.js';

// Every node, mark and attribute the frontend editor (EditorConfigs.ts) can emit.
// If the server schema drifts from the frontend, content is dropped on room load and
// this round trip stops being lossless. Marks are listed in schema order.
const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { textAlign: 'center', level: 2 }, content: [{ type: 'text', text: 'Title' }] },
    {
      type: 'paragraph',
      attrs: { textAlign: 'left' },
      content: [
        {
          type: 'text',
          text: 'styled',
          marks: [
            {
              type: 'textStyle',
              attrs: { backgroundColor: '#ffff00', color: '#ff0000', fontFamily: 'Inter', fontSize: '24px', lineHeight: '1.5' },
            },
            { type: 'bold' },
            { type: 'italic' },
            { type: 'strike' },
            { type: 'underline' },
          ],
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', attrs: { textAlign: 'left' }, content: [{ type: 'text', text: 'todo' }] }],
        },
      ],
    },
    { type: 'image', attrs: { src: 'https://example.com/a.png', width: 300, height: 200 } },
  ],
};

test('server schema round-trips frontend content without loss', () => {
  const ydoc = TiptapTransformer.toYdoc(doc, FRAGMENT_NAME, serverExtensions);
  const result = TiptapTransformer.fromYdoc(ydoc, FRAGMENT_NAME);
  // Normalize away empty attrs objects the transformer adds to marks.
  const normalize = (value: unknown) =>
    JSON.parse(JSON.stringify(value), (_key, v) =>
      v && typeof v === 'object' && !Array.isArray(v) && 'attrs' in v && Object.keys(v.attrs).length === 0
        ? (({ attrs: _a, ...rest }) => rest)(v)
        : v,
    );
  assert.deepEqual(normalize(result), normalize(doc));
});
