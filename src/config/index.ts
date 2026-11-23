import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';

/**
 * Tiptap schema used to convert between the stored JSON and the Y.Doc.
 *
 * MUST stay in sync with the frontend's `editorExtensions(true)` in
 * document-management-system-frontend/src/features/editor/configs/EditorConfigs.ts.
 * Any node, mark or attribute missing here is silently dropped when a room is
 * loaded, which trips the client's `enableContentCheck` and disables collaboration.
 * UI-only extensions (FileHandler, upload feedback plugins) carry no schema and are omitted.
 */
export const serverExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    undoRedo: false,
  }),
  TextStyleKit,
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'left',
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({
    resize: {
      enabled: true,
      alwaysPreserveAspectRatio: true,
    },
  }),
];

/** Y.XmlFragment name used by @tiptap/extension-collaboration (its default). */
export const FRAGMENT_NAME = 'default';
