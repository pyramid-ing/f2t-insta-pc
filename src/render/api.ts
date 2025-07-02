import axios from 'axios'

const API_BASE_URL = 'http://localhost:3554'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// PostJob 타입
export interface PostJob {
  id: string
  type: 'post' | 'dm'
  subject?: string
  desc: string
  dmMessage?: string
  targetUsers?: string
  loginId: string
  loginPw: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  resultMsg?: string
  resultUrl?: string
  scheduledAt: string
  postedAt?: string
  createdAt: string
  updatedAt: string
  latestLog?: JobLog | null
}

// JobLog 타입
export interface JobLog {
  id: string
  jobId: string
  message: string
  createdAt: string
  updatedAt: string
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

// ------------------------------
// PostJob API
// ------------------------------

// PostJob 목록 조회
export async function getPostJobs(options?: {
  status?: string
  search?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}): Promise<PostJob[]> {
  const params = new URLSearchParams()
  if (options?.status) params.append('status', options.status)
  if (options?.search) params.append('search', options.search)
  if (options?.orderBy) params.append('orderBy', options.orderBy)
  if (options?.order) params.append('order', options.order)

  const res = await apiClient.get(`/post-jobs?${params.toString()}`)
  return res.data
}

// PostJob 상세 조회 (로그 포함)
export async function getPostJob(id: string): Promise<PostJob> {
  const res = await apiClient.get(`/post-jobs/${id}`)
  return res.data
}

// PostJob 재시도
export async function retryPostJob(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post(`/post-jobs/${id}/retry`)
  return res.data
}

// PostJob 삭제
export async function deletePostJob(id: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.delete(`/post-jobs/${id}`)
  return res.data
}

// ------------------------------
// JobLog API
// ------------------------------

// 특정 Job의 로그 목록 가져오기
export async function getJobLogs(jobId: string): Promise<JobLog[]> {
  const res = await apiClient.get(`/logs/${jobId}`)
  return res.data.logs
}

// 특정 Job의 최신 로그 가져오기
export async function getLatestJobLog(jobId: string): Promise<JobLog | null> {
  const res = await apiClient.get(`/logs/${jobId}/latest`)
  return res.data.log
}

// ------------------------------
// Instagram API
// ------------------------------

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

// DM 예약 전송 (엑셀 업로드)
export async function uploadDmSchedule(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post('/post-jobs/dm/upload', formData)
  return res.data
}

// ------------------------------
// Settings API
// ------------------------------
export interface GlobalSetting {
  taskDelay?: number
  showBrowserWindow?: boolean
  minDelay?: number
  maxDelay?: number
  loginId?: string
  loginPassword?: string
}

// 글로벌 설정 불러오기 (로그인 정보, 딜레이 설정 포함)
export async function getGlobalSettings(): Promise<GlobalSetting> {
  const res = await apiClient.get('/settings/global')
  return res.data.data
}

// 글로벌 설정 저장 (로그인 정보, 딜레이 설정 포함)
export async function saveGlobalSettings(data: GlobalSetting) {
  const res = await apiClient.post('/settings/global', data)
  return res.data
}
