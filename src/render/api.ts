import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:3554',
})

// 에러 코드 enum
export enum ErrorCode {}

// 정규화된 에러 응답 타입
export interface ErrorResponse {
  success: false
  statusCode: number
  timestamp: string
  path: string
  error: string
  message: string
  code?: ErrorCode
  service?: string
  operation?: string
  details?: {
    stack?: string[]
    name?: string
    url?: string
    method?: string
    response?: any
    code?: string
    category?: string
    postData?: any
    ffmpegError?: string
    inputData?: any
    siteUrl?: string
    blogId?: string
    postId?: string
    configType?: string
    isExpired?: boolean
    additionalInfo?: Record<string, any>
  }
}

// 에러 메시지 생성 헬퍼 함수
export function getErrorMessage(error: any): string {
  if (error.response?.data) {
    const errorData = error.response.data as ErrorResponse

    // 정규화된 에러 구조인 경우
    if (errorData.code && errorData.service && errorData.operation) {
      return `[${errorData.service}/${errorData.operation}] ${errorData.message}`
    }

    // 기본 에러 메시지
    return errorData.message || error.message
  }

  return error.message || '알 수 없는 오류가 발생했습니다.'
}

// 에러 상세 정보 생성 헬퍼 함수
export function getErrorDetails(error: any): string | undefined {
  if (error.response?.data?.details?.additionalInfo) {
    const details = error.response.data.details.additionalInfo
    const detailStrings = []

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'boolean') {
        detailStrings.push(`${key}: ${value ? '있음' : '없음'}`)
      } else if (typeof value === 'string' || typeof value === 'number') {
        detailStrings.push(`${key}: ${value}`)
      }
    }

    return detailStrings.length > 0 ? detailStrings.join(', ') : undefined
  }

  return undefined
}

// 게시물 엑셀 내보내기
export async function exportPostsXlsx(data: { keyword: string; limit?: number; orderBy?: string }): Promise<Blob> {
  try {
    const res = await apiClient.post('/instagram/workflow/export-posts-xlsx', data, {
      responseType: 'blob',
    })
    return res.data
  } catch (error: any) {
    const errorMessage = getErrorMessage(error)
    throw new Error(errorMessage)
  }
}

// DM 보내기 (엑셀 업로드)
export async function sendDmTo(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post('/instagram/workflow/send-dm-to', formData)
  return res.data
}

// Instagram 로그인
export async function instagramLogin(): Promise<any> {
  const res = await apiClient.post('/instagram/workflow/login')
  return res.data
}

// Instagram 로그아웃
export async function instagramLogout(): Promise<any> {
  const res = await apiClient.post('/instagram/workflow/logout')
  return res.data
}

// 글로벌 설정 불러오기 (로그인 정보, 딜레이 설정 포함)
export async function getGlobalSettings() {
  const res = await apiClient.get('/settings/global')
  return res.data
}

// 글로벌 설정 저장 (로그인 정보, 딜레이 설정 포함)
export async function saveGlobalSettings(data: {
  minDelay?: number
  maxDelay?: number
  loginId?: string
  loginPassword?: string
}) {
  const res = await apiClient.post('/settings/global', data)
  return res.data
}

// 앱 설정 불러오기 (브라우저 창 표시 설정 등)
export async function getAppSettings() {
  const res = await apiClient.get('/settings/app')
  return res.data
}

// 앱 설정 저장 (브라우저 창 표시 설정 등)
export async function saveAppSettings(data: { showBrowserWindow?: boolean }) {
  const res = await apiClient.post('/settings/app', data)
  return res.data
}
