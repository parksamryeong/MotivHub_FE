const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,15}$/

export function getNicknameFormatError(nickname: string): string | null {
  if (nickname.length < 2) return '닉네임은 2자 이상이어야 합니다'
  if (nickname.length > 15) return '닉네임은 15자 이하여야 합니다'
  if (!NICKNAME_PATTERN.test(nickname)) return '한글, 영문, 숫자만 사용할 수 있습니다'
  return null
}
