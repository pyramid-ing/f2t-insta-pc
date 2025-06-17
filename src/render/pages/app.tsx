import { HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { Layout, Menu, Tabs } from 'antd'
import React, { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'
import ExportPostsXlsx from '../components/ExportPostsXlsx'
import SendDMForm from '../components/SendDMForm'
import TerminalLog from '../components/TerminalLog'
import SettingsPage from './Settings'

const { Sider, Header, Content } = Layout

const StyledLayout = styled(Layout)`
  min-height: 100vh;
`

const StyledHeader = styled(Header)`
  padding: 0 24px;
  background: #fff;
  font-size: 18px;
  font-weight: bold;
`

const StyledContent = styled(Content)`
  margin: 24px 16px;
  padding: 24px;
  background: #fff;
  min-height: 280px;
`

const Logo = styled.div`
  height: 32px;
  margin: 16px;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  border-radius: 4px;
`

interface AppStatus {
  initialized: boolean
  setupCompleted: boolean
  firstRun: boolean
  appVersion: string
  error?: string
}

const App: React.FC = () => {
  useEffect(() => {
    // 백엔드 포트 확인
    window.electronAPI
      .getBackendPort()
      .then((port) => {
        console.log('백엔드 포트:', port)
      })
      .catch((error) => {
        console.error('백엔드 포트 확인 실패:', error)
      })
  }, [])

  return (
    <StyledLayout>
      <Sider width={200}>
        <Logo>F2T 인덱싱</Logo>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<HomeOutlined />}>
            <NavLink to="/">인덱싱 대시보드</NavLink>
          </Menu.Item>
          <Menu.Item key="2" icon={<SettingOutlined />}>
            <NavLink to="/settings">설정</NavLink>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <StyledHeader>F2T 인덱싱 봇</StyledHeader>
        <StyledContent>
          <Routes>
            <Route
              path="/"
              element={(
                <Tabs defaultActiveKey="send-dm">
                  <Tabs.TabPane tab="DM 보내기" key="send-dm">
                    <SendDMForm />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="게시물 엑셀 내보내기" key="export-posts">
                    <ExportPostsXlsx />
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="작업 로그" key="logs">
                    {/* logs 상태는 상위에서 관리하거나 context로 전달 필요 */}
                    <TerminalLog logs={[]} />
                  </Tabs.TabPane>
                </Tabs>
              )}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default App
