import { Button, Form, Input, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { getGlobalSettings, saveGlobalSettings } from '../../api'

interface LoginSettings {
  loginId: string
  loginPassword: string
}

const LoginSettingsForm: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const globalSetting = await getGlobalSettings()
      form.setFieldsValue({
        loginId: globalSetting.loginId || '',
        loginPassword: globalSetting.loginPassword || '',
      })
    } catch (error) {
      console.error('로그인 설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: LoginSettings) => {
    setLoading(true)
    try {
      const globalSetting = await getGlobalSettings()
      const res = await saveGlobalSettings({
        ...globalSetting,
        loginId: values.loginId,
        loginPassword: values.loginPassword,
      })
      if (res.success) {
        message.success('로그인 정보가 저장되었습니다.')
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
    <Form form={form} layout="vertical" onFinish={handleSave} style={{ maxWidth: 400, marginTop: 24 }}>
      <Form.Item label="로그인 아이디" name="loginId" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
        <Input autoComplete="username" placeholder="로그인 아이디" />
      </Form.Item>

      <Form.Item label="비밀번호" name="loginPassword" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
        <Input.Password autoComplete="current-password" placeholder="비밀번호" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          저장
        </Button>
      </Form.Item>
    </Form>
  )
}

export default LoginSettingsForm
