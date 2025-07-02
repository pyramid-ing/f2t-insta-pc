import { Button, Form, InputNumber, message, Switch } from 'antd'
import React, { useEffect, useState } from 'react'
import { getGlobalSettings, GlobalSetting, saveGlobalSettings } from '../../api'

const GeneralSettingsForm: React.FC = () => {
  const [loading, setLoading] = useState(false)
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
          showBrowserWindow: globalSetting.showBrowserWindow ?? true,
          taskDelay: globalSetting.taskDelay ?? 10,
        })
      }
    } catch (error) {
      console.error('앱 설정 로드 실패:', error)
      message.error('설정을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (values: GlobalSetting) => {
    setLoading(true)
    try {
      const globalSetting = await getGlobalSettings()
      const res = await saveGlobalSettings({
        ...globalSetting,
        showBrowserWindow: values.showBrowserWindow,
        taskDelay: values.taskDelay,
      })
      if (res.success) {
        message.success('앱 설정이 저장되었습니다.')
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
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSave}
      style={{ maxWidth: 500, marginTop: 24 }}
      initialValues={{
        showBrowserWindow: true,
        taskDelay: 10,
      }}
    >
      <Form.Item
        label="브라우저 창 표시"
        name="showBrowserWindow"
        valuePropName="checked"
        extra="작업 실행 시 브라우저 창을 표시할지 설정합니다."
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="작업 간 딜레이 (초)"
        name="taskDelay"
        rules={[
          { required: true, message: '딜레이 시간을 입력하세요.' },
          { type: 'number', min: 0, max: 300, message: '0-300초 사이의 값을 입력하세요.' },
        ]}
        extra="연속 작업 실행 시 작업 간 대기 시간을 설정합니다."
      >
        <InputNumber min={0} max={300} addonAfter="초" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          저장
        </Button>
      </Form.Item>
    </Form>
  )
}

export default GeneralSettingsForm
