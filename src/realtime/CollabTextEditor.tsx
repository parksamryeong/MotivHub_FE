import { useEffect, useRef, type ReactElement } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, placeholder } from '@codemirror/view'
import { yCollab } from 'y-codemirror.next'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { useAuthStore } from '../stores/authStore'

const CURSOR_COLORS = [
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#65a30d',
]

const editorTheme = EditorView.theme({
  '&': { fontSize: '0.875rem', backgroundColor: 'transparent', color: 'inherit' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.5' },
  '.cm-content': { fontFamily: 'inherit', padding: '0.5rem 0.75rem', caretColor: 'currentColor' },
  '.cm-placeholder': { color: 'var(--color-text-secondary)' },
})

export function CollabTextEditor({
  ytext,
  awareness,
  placeholderText,
  maxLength,
}: {
  ytext: Y.Text
  awareness: Awareness
  placeholderText: string
  maxLength: number
}): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const user = useAuthStore((state) => state.user)
  const userRef = useRef(user)
  userRef.current = user

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: ytext.toString(),
        extensions: [
          yCollab(ytext, awareness),
          editorTheme,
          placeholder(placeholderText),
          EditorView.lineWrapping,
          EditorState.transactionFilter.of((tr) => {
            if (!tr.docChanged || !tr.isUserEvent('input')) return tr
            return tr.newDoc.length > maxLength ? [] : tr
          }),
          EditorView.domEventHandlers({
            focus: () => {
              const current = userRef.current
              if (!current) return
              awareness.setLocalStateField('user', {
                name: current.nickname,
                color: CURSOR_COLORS[current.id % CURSOR_COLORS.length],
                colorLight: `${CURSOR_COLORS[current.id % CURSOR_COLORS.length]}33`,
              })
            },
          }),
        ],
      }),
    })
    return () => view.destroy()
  }, [ytext, awareness, placeholderText, maxLength])

  return (
    <div
      ref={containerRef}
      className="min-h-32 w-full overflow-hidden rounded-lg border border-card-border bg-card-bg text-text-primary"
    />
  )
}
