import { Button, Form, InputNumber, message } from 'antd'
import React, { useState } from 'react'

const DelaySettings: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { minDelay: number, maxDelay: number }) => {
    setLoading(true)
    try {
      // 실제 저장 API 연동 필요
      message.success('딜레이 설정이 저장되었습니다.')
    }
    catch (e) {
      message.error('딜레이 설정 저장에 실패했습니다.')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <Form layout="vertical" onFinish={onFinish} style={{ maxWidth: 400 }} initialValues={{ minDelay: 1000, maxDelay: 3000 }}>
      <Form.Item label="최소 딜레이 (ms)" name="minDelay" rules={[{ required: true, message: '최소 딜레이를 입력하세요.' }]}>
        <InputNumber min={0} step={100} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item label="최대 딜레이 (ms)" name="maxDelay" rules={[{ required: true, message: '최대 딜레이를 입력하세요.' }]}>
        <InputNumber min={0} step={100} style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          저장
        </Button>
      </Form.Item>
    </Form>
  )
}

export default DelaySettings
