export type OAuthProvider = 'google' | 'github' | 'kakao' | 'naver'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: number
  nickname: string
  nicknameConfigured: boolean
  email: string
  profileImageUrl: string | null
  provider: OAuthProvider
  createdAt: string
}

export interface MyPageProfile {
  nickname: string
  email: string
  profileImageUrl: string | null
  createdAt: string
}

export interface NicknameCheckResponse {
  available: boolean
}

export type WorkspaceRole = 'OWNER' | 'MEMBER'

export interface WorkspaceResponse {
  id: number
  name: string
  myRole: WorkspaceRole
  createdAt: string
}

export interface UserSummary {
  id: number
  nickname: string
  profileImageUrl: string | null
}

export interface MemberSummary {
  user: UserSummary
  role: WorkspaceRole
  joinedAt: string
}

export interface WorkspaceDetailResponse extends WorkspaceResponse {
  members: MemberSummary[]
}

export interface WorkspaceInviteResponse {
  id: number
  token: string
  email: string | null
  expiresAt: string
}

export interface ApiErrorResponse {
  code: string
  message: string
  timestamp: string
}

export type TaskStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'EXPIRED'

export interface TaskResponse {
  id: number
  workspaceId: number
  name: string
  description: string | null
  startDate: string
  dueDate: string
  status: TaskStatus
  assignees: UserSummary[]
  createdBy: UserSummary
  createdAt: string
}

export interface TaskCommentResponse {
  id: number
  author: UserSummary
  content: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistItemResponse {
  id: number
  content: string
  isDone: boolean
  orderIndex: number
  createdAt: string
}

export interface TaskDetailResponse extends TaskResponse {
  checklistItems: ChecklistItemResponse[]
}

export type TaskActivityAction =
  | 'CREATE'
  | 'UPDATE_CONTENT'
  | 'UPDATE_PERIOD'
  | 'CHANGE_STATUS'
  | 'ADD_ASSIGNEE'
  | 'REMOVE_ASSIGNEE'

export interface TaskActivityResponse {
  id: number
  actor: UserSummary
  action: TaskActivityAction
  field: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export interface WorkspaceFileResponse {
  id: number
  fileName: string
  fileSize: number
  contentType: string
  uploadedBy: UserSummary
  createdAt: string
}

export interface FilePresignResponse {
  uploadUrl: string
  fileKey: string
}

export interface FileDownloadResponse {
  downloadUrl: string
}
