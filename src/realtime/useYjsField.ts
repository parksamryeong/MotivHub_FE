import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { publishMessage } from './stompClient'
import { useTopic } from './useTopic'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function useYjsField({
  taskId,
  field,
  canEdit,
  initialContent,
}: {
  taskId: number
  field: 'description' | 'note'
  canEdit: boolean
  initialContent: string | undefined
}): { text: string; handleChange: (newValue: string) => void } {
  const [ydoc] = useState(() => new Y.Doc())
  const ytext = ydoc.getText('content')
  const initializedRef = useRef(false)
  const [text, setText] = useState('')

  // Y.Text를 딱 한 번만 초기 내용으로 시딩한다. canEdit이 아니거나 아직 초기값을
  // 못 받았으면 대기하고, 그 이후로는 initialContent가 바뀌어도 다시 시딩하지 않는다
  // (REST 재조회로 값이 갱신돼도 타이핑 중인 내용을 덮어쓰지 않기 위함).
  useEffect(() => {
    if (!canEdit || initializedRef.current || initialContent === undefined) return
    ydoc.transact(() => {
      ytext.insert(0, initialContent)
    }, 'init')
    initializedRef.current = true
  }, [canEdit, initialContent])

  useEffect(() => {
    const observer = () => setText(ytext.toString())
    ytext.observe(observer)
    setText(ytext.toString())
    return () => ytext.unobserve(observer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useTopic<{ update: string }>(
    canEdit ? `/topic/tasks/${taskId}/${field}/edits` : null,
    (message) => {
      Y.applyUpdate(ydoc, fromBase64(message.update), 'remote')
    }
  )

  useTopic<{ updates: string[] }>(
    canEdit ? `/user/queue/tasks/${taskId}/${field}/edits` : null,
    (message) => {
      message.updates.forEach((update) => Y.applyUpdate(ydoc, fromBase64(update), 'remote'))
    }
  )

  useTopic<Record<string, never>>(
    canEdit ? `/topic/tasks/${taskId}/${field}/save-request` : null,
    () => {
      publishMessage(`/app/tasks/${taskId}/${field}/snapshot`, { content: ytext.toString() })
    }
  )

  useEffect(() => {
    function onUpdate(update: Uint8Array, origin: unknown) {
      if (origin === 'remote' || origin === 'init') return
      publishMessage(`/app/tasks/${taskId}/${field}/edits`, { update: toBase64(update) })
    }
    ydoc.on('update', onUpdate)
    return () => ydoc.off('update', onUpdate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(newValue: string): void {
    if (!canEdit) return
    const oldValue = ytext.toString()

    let start = 0
    while (
      start < oldValue.length &&
      start < newValue.length &&
      oldValue[start] === newValue[start]
    ) {
      start++
    }
    let oldEnd = oldValue.length
    let newEnd = newValue.length
    while (oldEnd > start && newEnd > start && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd--
      newEnd--
    }

    ydoc.transact(() => {
      if (oldEnd > start) ytext.delete(start, oldEnd - start)
      if (newEnd > start) ytext.insert(start, newValue.slice(start, newEnd))
    })
  }

  return {
    text: canEdit ? text : (initialContent ?? ''),
    handleChange,
  }
}
