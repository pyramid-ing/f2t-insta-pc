import { SettingOutlined } from '@ant-design/icons'
import { Card, message, Tabs, Typography, Button, Form, Input } from 'antd'
import React, { useEffect, useState } from 'react'
import DelaySettings from '../components/settings/DelaySettings'
import { getInstagramSettings, saveInstagramSettings } from '../api'

const { Title } = Typography

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('delay')
  const [form] = Form.useForm()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)

      // 전역 엔진 설정 로드
      try {
      } catch (engineError) {
        console.log('전역 엔진 설정 로드 실패 (첫 실행일 수 있음):', engineError)
      }

      // 인스타그램 설정 불러오기
      const res = await getInstagramSettings()
      if (res.success && res.data) {
        form.setFieldsValue({
          igId: res.data.igId || '',
          igPw: res.data.igPw || '',
        })
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLogin = async (values: { igId: string; igPw: string }) => {
    setLoading(true)
    try {
      const res = await saveInstagramSettings({ igId: values.igId, igPw: values.igPw })
      if (res.success) {
        message.success('인스타그램 로그인 정보가 저장되었습니다.')
      } else {
        message.error('저장 실패')
      }
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SettingOutlined style={{ marginRight: 8 }} />
          설정
        </Title>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={[
            {
              key: 'delay',
              label: '일반',
              children: <DelaySettings />,
            },
            {
              key: 'login',
              label: '인스타그램 로그인',
              children: (
                <Form form={form} layout="vertical" onFinish={handleSaveLogin} style={{ maxWidth: 400, marginTop: 24 }}>
                  <Form.Item
                    label="인스타그램 아이디"
                    name="igId"
                    rules={[{ required: true, message: '아이디를 입력하세요.' }]}
                  >
                    <Input autoComplete="username" />
                  </Form.Item>
                  <Form.Item
                    label="비밀번호"
                    name="igPw"
                    rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
                  >
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                      저장
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default Settings
