const RECENT_WORKSPACES_KEY = 'motivhub-recent-workspaces'
const MAX_RECENT = 3

export function recordRecentWorkspace(workspaceId: number): void {
  try {
    const current = getRecentWorkspaceIds()
    const next = [workspaceId, ...current.filter((id) => id !== workspaceId)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next))
  } catch {
    // localStorage 접근 불가 시 조용히 무시 — 최근 접근 기록이 다음 방문까지 기억되지 않을 뿐 기능엔 영향 없음
  }
}

export function getRecentWorkspaceIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_WORKSPACES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is number => typeof id === 'number')
  } catch {
    return []
  }
}
