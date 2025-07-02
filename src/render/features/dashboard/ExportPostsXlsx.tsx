import { Button, Form, Input, InputNumber, message, Select } from 'antd'
import React, { useState } from 'react'
import { createExportJob } from '../../api'

const ExportPostsXlsx: React.FC = () => {
  const [loading, setLoading] = useState(false)

  return (
    <div>
      <Form
        layout="vertical"
        onFinish={async (values: { keyword: string; limit?: number; orderBy?: string }) => {
          setLoading(true)
          try {
            // Job 시스템으로 처리
            const result = await createExportJob(values)
            message.success(`${result.message} 작업 관리 페이지에서 진행상황을 확인할 수 있습니다.`)
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
