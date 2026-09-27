export function getSignupPasswordError(password: string): string | null {
  if (password.length < 8 || password.length > 72) return '비밀번호는 8~72자여야 합니다'
  if (/[^\x21-\x7E]/.test(password)) return '한글, 공백은 사용할 수 없습니다'
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return '영문과 숫자를 모두 포함해야 합니다'
  }
  return null
}
