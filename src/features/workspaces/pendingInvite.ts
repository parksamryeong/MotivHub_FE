const STORAGE_KEY = 'pendingInviteToken'

export function setPendingInviteToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function consumePendingInviteToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEY)
  if (token) {
    localStorage.removeItem(STORAGE_KEY)
  }
  return token
}
