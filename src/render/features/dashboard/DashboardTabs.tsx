import { Tabs } from 'antd'
import React from 'react'
import ExportPostsXlsx from './ExportPostsXlsx'
import SendDMForm from './SendDMForm'

const DashboardTabs: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Tabs
        defaultActiveKey="1"
        size="large"
        items={[
          {
            key: '1',
            label: '게시물 수집',
            children: <ExportPostsXlsx />,
          },
          {
            key: '2',
            label: 'DM 보내기',
            children: <SendDMForm />,
          },
        ]}
      />
    </div>
  )
}

export default DashboardTabs
