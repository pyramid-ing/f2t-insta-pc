import { Alert, Button, Card, Form, Input, message, Space, Switch, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import { getGlobalSettings, getTetherHealthCheck, resetTethering, saveGlobalSettings } from '../../api'

const { Text, Title } = Typography

const TetherSettingsForm: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [tetherHealthLoading, setTetherHealthLoading] = useState(false)
  const [tetherResetLoading, setTetherResetLoading] = useState(false)
  const [tetherHealth, setTetherHealth] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const globalSetting = await getGlobalSettings()

      if (globalSetting) {
        form.setFieldsValue({
          useTethering: globalSetting.useTethering ?? false,
          tetherInterface: globalSetting.tetherInterface ?? 'enp0s20u2',
        })
      }
    } catch (error) {
      console.error('테더링 설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: { useTethering: boolean; tetherInterface: string }) => {
    setLoading(true)
    try {
      const globalSetting = await getGlobalSettings()
      const res = await saveGlobalSettings({
        ...globalSetting,
        useTethering: values.useTethering,
        tetherInterface: values.tetherInterface,
      })
      if (res.success) {
        message.success('테더링 설정이 저장되었습니다.')
      } else {
        message.error('저장 실패')
      }
    } catch {
      message.error('저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleTetherHealthCheck = async () => {
    setTetherHealthLoading(true)
    try {
      const result = await getTetherHealthCheck()
      setTetherHealth(result)
      if (result.success) {
        message.success('헬스체크 완료')
      } else {
        message.error(`헬스체크 실패: ${result.error}`)
      }
    } catch (error: any) {
      message.error(`헬스체크 실패: ${error.message}`)
      setTetherHealth({ success: false, error: error.message })
    } finally {
      setTetherHealthLoading(false)
    }
  }

  const handleTetherReset = async () => {
    setTetherResetLoading(true)
    try {
      const result = await resetTethering()
      if (result.success) {
        message.success('테더링 리셋 완료')
        // 리셋 후 헬스체크 자동 실행
        setTimeout(() => {
          handleTetherHealthCheck()
        }, 2000)
      } else {
        message.error(`테더링 리셋 실패: ${result.error}`)
      }
    } catch (error: any) {
      message.error(`테더링 리셋 실패: ${error.message}`)
    } finally {
      setTetherResetLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        테더링 설정
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          useTethering: false,
          tetherInterface: 'enp0s20u2',
        }}
      >
        <Card size="small" style={{ marginBottom: 24 }}>
          <Form.Item
            label="테더링 사용"
            name="useTethering"
            valuePropName="checked"
            extra="인스타그램 작업 시 안드로이드 테더링을 통한 IP 변경 기능을 사용합니다."
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="테더링 인터페이스"
            name="tetherInterface"
            extra="테더링 네트워크 인터페이스 명을 설정합니다. (예: enp0s20u2)"
            rules={[{ required: true, message: '테더링 인터페이스를 입력하세요.' }]}
          >
            <Input placeholder="enp0s20u2" />
          </Form.Item>
        </Card>

        <Card title="연결 상태 확인" size="small" style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">
                아래 버튼들을 사용하여 안드로이드 연결 상태를 확인하고 테더링을 관리할 수 있습니다.
              </Text>
            </div>

            <Space>
              <Button onClick={handleTetherHealthCheck} loading={tetherHealthLoading} type="default">
                헬스체크
              </Button>
              <Button onClick={handleTetherReset} loading={tetherResetLoading} danger>
                테더링 리셋
              </Button>
            </Space>

            {tetherHealth && (
              <Alert
                message={tetherHealth.success ? '연결 상태 양호' : '연결 상태 불량'}
                description={
                  tetherHealth.success && tetherHealth.data ? (
                    <div>
                      <Text>• ADB 연결: {tetherHealth.data.adbConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</Text>
                      <br />
                      <Text>• 현재 IP: {tetherHealth.data.currentIp || '확인 불가'}</Text>
                      <br />
                      <Text>• 연결된 기기: {tetherHealth.data.devices.length}개</Text>
                      <br />
                      <Text style={{ fontSize: '12px', color: '#666' }}>
                        기기 목록: {tetherHealth.data.devices.join(', ') || '없음'}
                      </Text>
                    </div>
                  ) : (
                    <Text>{tetherHealth.error || '알 수 없는 오류'}</Text>
                  )
                }
                type={tetherHealth.success ? 'success' : 'error'}
                showIcon
              />
            )}
          </Space>
        </Card>

        <Card title="사용 방법" size="small" style={{ marginBottom: 24 }}>
          <div style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>준비 사항:</strong>
            </div>
            <div>• ADB 도구 설치 및 PATH 설정</div>
            <div>• 안드로이드 기기 USB 연결</div>
            <div>• 안드로이드 기기에서 USB 디버깅 허용</div>
            <div>• 안드로이드 기기에서 USB 테더링 활성화</div>
            <div style={{ marginTop: '12px', marginBottom: '8px' }}>
              <strong>동작 방식:</strong>
            </div>
            <div>• IP 변경이 필요할 때 자동으로 테더링을 재시작합니다</div>
            <div>• 최대 3회까지 IP 변경을 시도합니다</div>
            <div>• 변경 실패 시 작업을 중단합니다</div>
          </div>
        </Card>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            설정 저장
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default TetherSettingsForm
