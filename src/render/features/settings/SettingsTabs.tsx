import { SettingOutlined } from '@ant-design/icons'
import { Card, Tabs, Typography } from 'antd'
import React, { useState } from 'react'
import GeneralSettingsForm from './GeneralSettingsForm'
import LoginSettingsForm from './LoginSettingsForm'
import TetherSettingsForm from './TetherSettingsForm'

const { Title } = Typography

const SettingsTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general')

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
              key: 'general',
              label: '일반',
              children: <GeneralSettingsForm />,
            },
            {
              key: 'login',
              label: '로그인 정보',
              children: <LoginSettingsForm />,
            },
            {
              key: 'tether',
              label: '테더링',
              children: <TetherSettingsForm />,
            },
          ]}
        />
      </Card>
    </div>
  )
}

export default SettingsTabs
