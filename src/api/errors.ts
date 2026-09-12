import { isAxiosError } from 'axios'
import type { ApiErrorResponse } from './types'

const DEFAULT_MESSAGE = '요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.'

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorResponse>(error) && error.response?.data?.message) {
    return error.response.data.message
  }
  return DEFAULT_MESSAGE
}

export function getErrorCode(error: unknown): string | undefined {
  if (isAxiosError<ApiErrorResponse>(error) && error.response?.data?.code) {
    return error.response.data.code
  }
  return undefined
}
