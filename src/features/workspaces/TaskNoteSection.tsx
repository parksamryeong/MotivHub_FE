import { type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTaskNote } from '../../api/taskNote'
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

  const { text, handleChange } = useYjsField({
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
      ) : (
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          maxLength={50000}
          placeholder="자유롭게 메모를 남겨보세요"
          className="min-h-32 w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary"
        />
      )}
    </div>
  )
}
