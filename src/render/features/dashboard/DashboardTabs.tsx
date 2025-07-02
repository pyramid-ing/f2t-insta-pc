import { Tabs } from 'antd'
import React from 'react'
import ScheduledPostsTable from '../work-management/ScheduledPostsTable'
import DmScheduleUpload from './DmScheduleUpload'
import ExportPostsXlsx from './ExportPostsXlsx'

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
            label: 'DM 전송',
            children: <DmScheduleUpload />,
          },
        ]}
      />

      {/* 작업관리는 탭 밖에서 항상 보이도록 배치 */}
      <div style={{ marginTop: '24px' }}>
        <ScheduledPostsTable />
      </div>
    </div>
  )
}

export default DashboardTabs
