import { type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTaskNote } from '../../api/taskNote'
import { CollabTextEditor } from '../../realtime/CollabTextEditor'
import { useYjsField } from '../../realtime/useYjsField'

export function TaskNoteSection({
  taskId,
  canEdit,
}: {
  taskId: number
  canEdit: boolean
}): ReactElement {
  const noteQuery = useQuery({
    queryKey: ['tasks', taskId, 'note'],
    queryFn: () => fetchTaskNote(taskId),
  })

  const { text, ytext, awareness } = useYjsField({
    taskId,
    field: 'note',
    canEdit,
    initialContent: noteQuery.data ? (noteQuery.data.content ?? '') : undefined,
  })

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-primary">노트</h3>
      {noteQuery.isLoading ? (
        <p className="text-xs text-text-secondary">로딩 중...</p>
      ) : canEdit ? (
        <CollabTextEditor
          ytext={ytext}
          awareness={awareness}
          placeholderText="자유롭게 메모를 남겨보세요"
          maxLength={50000}
        />
      ) : (
        <textarea
          readOnly
          value={text}
          className="min-h-32 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        />
      )}
    </div>
  )
}
