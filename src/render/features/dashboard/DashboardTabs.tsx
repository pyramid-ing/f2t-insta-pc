import { getCurrentIp, getGlobalSettings, getTetherHealthCheck } from '@render/api'
import { Badge, Button, Card, Space, Spin, Tabs, Typography } from 'antd'
import React, { useEffect, useState } from 'react'
import ScheduledPostsTable from '../work-management/ScheduledPostsTable'
import DmScheduleUpload from './DmScheduleUpload'
import ExportPostsXlsx from './ExportPostsXlsx'

const { Text } = Typography

interface IpStatusState {
  ip: string
  loading: boolean
  tetherEnabled: boolean
  adbConnected: boolean
}

const DashboardTabs: React.FC = () => {
  const [ipStatus, setIpStatus] = useState<IpStatusState>({
    ip: '',
    loading: true,
    tetherEnabled: false,
    adbConnected: false,
  })

  const fetchIpStatus = async () => {
    try {
      setIpStatus(prev => ({ ...prev, loading: true }))

      // 글로벌 설정에서 테더링 활성화 여부 확인
      const settings = await getGlobalSettings()

      if (settings.useTethering) {
        // 테더링이 활성화된 경우 헬스체크로 상세 정보 가져오기
        const healthCheck = await getTetherHealthCheck()
        if (healthCheck.success && healthCheck.data) {
          setIpStatus({
            ip: healthCheck.data.currentIp,
            loading: false,
            tetherEnabled: true,
            adbConnected: healthCheck.data.adbConnected,
          })
        } else {
          setIpStatus(prev => ({
            ...prev,
            loading: false,
            tetherEnabled: true,
            adbConnected: false,
          }))
        }
      } else {
        // 테더링이 비활성화된 경우 간단히 IP만 가져오기
        const ipResult = await getCurrentIp()
        setIpStatus({
          ip: ipResult.success && ipResult.data ? ipResult.data.ip : '',
          loading: false,
          tetherEnabled: false,
          adbConnected: false,
        })
      }
    } catch (error) {
      console.error('IP 상태 조회 실패:', error)
      setIpStatus(prev => ({ ...prev, loading: false }))
    }
  }

  useEffect(() => {
    fetchIpStatus()
    // 30초마다 IP 상태 갱신
    const interval = setInterval(fetchIpStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderIpStatus = () => {
    const { ip, loading, tetherEnabled, adbConnected } = ipStatus

    if (loading) {
      return (
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Space>
            <Spin size="small" />
            <Text>IP 정보 로딩 중...</Text>
          </Space>
        </Card>
      )
    }

    const statusColor = tetherEnabled ? (adbConnected ? 'success' : 'warning') : 'default'
    const statusText = tetherEnabled ? (adbConnected ? '테더링 연결됨' : '테더링 설정 오류') : '테더링 비활성화'

    return (
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Space>
          <Badge status={statusColor} />
          <Text strong>현재 IP:</Text>
          <Text code>{ip || '알 수 없음'}</Text>
          <Text type="secondary">({statusText})</Text>
          <Button size="small" onClick={fetchIpStatus}>
            새로고침
          </Button>
        </Space>
      </Card>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* IP 상태 표시 */}
      {renderIpStatus()}

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
