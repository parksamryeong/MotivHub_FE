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

export interface WorkspaceTaskCounts {
  waiting: number
  inProgress: number
  done: number
  expired: number
}

export interface WorkspaceResponse {
  id: number
  name: string
  myRole: WorkspaceRole
  createdAt: string
  taskCounts: WorkspaceTaskCounts
  memberCount: number
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

export interface WorkspaceDetailResponse {
  id: number
  name: string
  myRole: WorkspaceRole
  createdAt: string
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

export interface MyTaskResponse {
  taskId: number
  name: string
  dueDate: string
  status: TaskStatus
  workspaceId: number
  workspaceName: string
  checklistTotal: number
  checklistCompleted: number
  hasComments: boolean
}

export interface WorkspaceFileResponse {
  id: number
  fileName: string
  fileSize: number
  contentType: string
  category: string | null
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

export interface IssueResponse {
  id: number
  workspaceId: number
  workspaceName: string
  title: string
  problemDescription: string
  solution: string | null
  author: UserSummary
  createdAt: string
  updatedAt: string
  commentCount: number
}

export interface IssueCommentResponse {
  id: number
  author: UserSummary
  content: string
  createdAt: string
  updatedAt: string
}

export type NotificationType =
  | 'DUE_DATE_APPROACHING'
  | 'ASSIGNEE_ADDED'
  | 'TASK_COMMENT_ADDED'
  | 'CHECKLIST_COMPLETED'

export type NotificationTargetType = 'TASK'

export interface NotificationResponse {
  id: number
  type: NotificationType
  targetType: NotificationTargetType
  targetId: number
  message: string
  isRead: boolean
  createdAt: string
  readAt: string | null
}

export interface NotificationPageResponse {
  content: NotificationResponse[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  last: boolean
}

export type TaskChangeType = 'CREATED' | 'UPDATED' | 'DELETED'

export interface TaskChangedMessage {
  taskId: number
}

export interface TaskPresenceMessage {
  taskId: number
  viewers: UserSummary[]
}

export interface TaskBoardChangeMessage {
  changeType: TaskChangeType
  taskId: number
  task: TaskResponse | null
}

export interface TaskNoteResponse {
  taskId: number
  content: string | null
  updatedBy: UserSummary | null
  updatedAt: string | null
}
