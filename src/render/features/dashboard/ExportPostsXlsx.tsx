import { Button, Divider, Form, Input, InputNumber, message, Select, Space } from 'antd'
import React, { useState } from 'react'
import { exportPostsXlsx, exportSampleXlsx } from '../../api'

const ExportPostsXlsx: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)

  const handleSampleDownload = async () => {
    setSampleLoading(true)
    try {
      const blob = await exportSampleXlsx()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sample_dm_template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      message.success('샘플 엑셀 파일이 다운로드되었습니다.')
    } catch (e: any) {
      const errorMessage = e?.message || '샘플 파일 다운로드에 실패했습니다.'
      message.error(`에러: ${errorMessage}`)
    } finally {
      setSampleLoading(false)
    }
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 400 }}>
        <div>
          <Button
            type="default"
            onClick={handleSampleDownload}
            loading={sampleLoading}
            block
            style={{ marginBottom: 16 }}
          >
            샘플 엑셀 템플릿 다운로드
          </Button>
          <Divider>또는</Divider>
        </div>
      </Space>
      <Form
        layout="vertical"
        onFinish={async (values: { keyword: string; limit?: number; orderBy?: string }) => {
          setLoading(true)
          try {
            const blob = await exportPostsXlsx(values)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'export.xlsx'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            message.success('엑셀 파일이 다운로드되었습니다.')
          } catch (e: any) {
            const errorMessage = e?.message || '엑셀 내보내기에 실패했습니다.'
            message.error(`에러: ${errorMessage}`)
          } finally {
            setLoading(false)
          }
        }}
        style={{ maxWidth: 400 }}
      >
        <Form.Item label="검색 키워드" name="keyword" rules={[{ required: true, message: '키워드를 입력하세요.' }]}>
          <Input placeholder="예: 여행" />
        </Form.Item>
        <Form.Item label="정렬 방식" name="orderBy" initialValue="recent">
          <Select>
            <Select.Option value="recent">최신순</Select.Option>
            <Select.Option value="top">인기순</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="검색 개수 (선택)" name="limit">
          <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="기본값: 약 50" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            인스타그램에서 검색해서 엑셀로 내보내기
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default ExportPostsXlsx
