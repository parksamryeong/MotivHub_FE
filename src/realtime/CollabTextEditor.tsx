import { useEffect, useRef, type ReactElement } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, placeholder } from '@codemirror/view'
import { yCollab } from 'y-codemirror.next'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { useAuthStore } from '../stores/authStore'

// dataviz 검증 범주형 팔레트(라이트 모드). 앞 3색은 모든 쌍 CVD 기준을 통과하고, 나머지는
// 색만으로 구분이 어려울 수 있어 이름표가 식별자 역할을 한다.
const CURSOR_PALETTE = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
]

function pickCursorColor(awareness: Awareness): string {
  const used = new Set<string>()
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return
    const color = (state as { user?: { color?: string } }).user?.color
    if (color) used.add(color)
  })
  return (
    CURSOR_PALETTE.find((color) => !used.has(color)) ??
    CURSOR_PALETTE[awareness.clientID % CURSOR_PALETTE.length]
  )
}

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
    let color: string | null = null
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
              color ??= pickCursorColor(awareness)
              awareness.setLocalStateField('user', {
                name: current.nickname,
                color,
                colorLight: `${color}33`,
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
