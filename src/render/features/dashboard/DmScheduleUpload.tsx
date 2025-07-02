import { UploadOutlined } from '@ant-design/icons'
import { uploadDmSchedule } from '@render/api'
import { Button, Card, message, Upload } from 'antd'
import React, { useState } from 'react'

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

  return (
    <Card title="DM 예약 전송" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
