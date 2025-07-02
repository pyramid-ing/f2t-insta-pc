import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { uploadDmSchedule } from '@render/api'
import { Button, Card, message, Space, Upload } from 'antd'
import React, { useState } from 'react'
import * as XLSX from 'xlsx'

const DmScheduleUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadDmSchedule(file)
      message.success(result.message || 'DM 전송 작업이 등록되었습니다.')
      // 테이블 새로고침을 위해 전체 페이지 리렌더링
      window.location.reload()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'DM 작업 등록에 실패했습니다.'
      message.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const downloadSampleExcel = () => {
    // 샘플 데이터
    const sampleData = [
      {
        유저ID: 'sample_user1',
        DM: '안녕하세요! 샘플 메시지입니다. 🔥',
        예약날짜: '2025-07-01 14:00',
      },
      {
        유저ID: 'sample_user2',
        DM: 'Hello! This is a sample DM message.',
        예약날짜: '2025-07-01 15:30',
      },
      {
        유저ID: 'sample_user3',
        DM: '예약 없이 즉시 전송할 메시지입니다.',
        예약날짜: '', // 비어있으면 즉시 전송
      },
    ]

    // 엑셀 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DM전송목록')

    // 파일 다운로드
    XLSX.writeFile(workbook, 'DM전송_샘플.xlsx')
    message.success('샘플 엑셀 파일이 다운로드되었습니다.')
  }

  return (
    <Card title="DM 예약 전송" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Space>
            <Upload
              beforeUpload={file => {
                handleUpload(file)
                return false // 자동 업로드 방지
              }}
              accept=".xlsx,.xls"
              showUploadList={false}
              disabled={uploading}
            >
              <Button icon={<UploadOutlined />} loading={uploading} type="primary">
                엑셀 파일 업로드
              </Button>
            </Upload>

            <Button icon={<DownloadOutlined />} onClick={downloadSampleExcel} type="default">
              샘플 파일 다운로드
            </Button>
          </Space>
        </div>

        <div
          style={{
            color: '#666',
            fontSize: '14px',
            padding: '12px',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
          }}
        >
          <div>
            <strong>📋 엑셀 파일 형식 안내:</strong>
          </div>
          <div>
            • <strong>유저ID</strong>: 인스타그램 사용자 ID (@ 없이 입력)
          </div>
          <div>
            • <strong>DM</strong>: 전송할 메시지 내용
          </div>
          <div>
            • <strong>예약날짜</strong>: 전송 예약 시간 (예: 2025-07-01 14:00) - 비어있으면 즉시 전송
          </div>
        </div>
      </div>
    </Card>
  )
}

export default DmScheduleUpload
