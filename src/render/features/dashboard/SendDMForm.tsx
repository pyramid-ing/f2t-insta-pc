import { UploadOutlined } from '@ant-design/icons'
import { Button, Form, message, Upload } from 'antd'
import React, { useState } from 'react'
import { uploadDmSchedule } from '../../api'

const SendDMForm: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  return (
    <div>
      <Form
        layout="vertical"
        onFinish={async () => {
          if (!file) {
            message.warning('엑셀 파일을 업로드해주세요.')
            return
          }
          setLoading(true)
          try {
            const res = await uploadDmSchedule(file)
            if (res.success) {
              message.success(`${res.message} 작업 관리 페이지에서 진행상황을 확인할 수 있습니다.`)
              setFile(null) // 업로드 후 파일 초기화
            } else {
              message.error(res.message || 'DM 작업 등록에 실패했습니다.')
            }
          } catch (e: any) {
            const errorMessage = e?.message || 'DM 작업 등록에 실패했습니다.'
            message.error(`에러: ${errorMessage}`)
          } finally {
            setLoading(false)
          }
        }}
        style={{ maxWidth: 400 }}
      >
        <Form.Item label="엑셀 파일 업로드" required>
          <Upload
            beforeUpload={file => {
              setFile(file)
              return false
            }}
            maxCount={1}
            accept=".xlsx"
            showUploadList={!!file}
            fileList={file ? [{ uid: '1', name: file.name, status: 'done' } as any] : []}
            onRemove={() => setFile(null)}
          >
            <Button icon={<UploadOutlined />}>엑셀 파일 선택</Button>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            DM 작업 등록
          </Button>
        </Form.Item>
      </Form>

    </div>
  )
}

export default SendDMForm
