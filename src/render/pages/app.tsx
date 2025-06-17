import { HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { Layout, Menu, Tabs } from 'antd'
import React, { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import styled from 'styled-components'
import ExportPostsXlsx from '../components/ExportPostsXlsx'
import SendDMForm from '../components/SendDMForm'
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

const App: React.FC = () => {
  useEffect(() => {
    // 백엔드 포트 확인
    window.electronAPI
      .getBackendPort()
      .then((port) => {
      })
      .catch((error) => {
        console.error('백엔드 포트 확인 실패:', error)
      })
  }, [])

  return (
    <StyledLayout>
      <Sider width={200}>
        <Logo>인스타그램 봇</Logo>
        <Menu
          theme="dark"
          defaultSelectedKeys={['1']}
          mode="inline"
          items={[
            {
              key: '1',
              icon: <HomeOutlined />,
              label: <NavLink to="/">인스타 대시보드</NavLink>,
            },
            {
              key: '2',
              icon: <SettingOutlined />,
              label: <NavLink to="/settings">설정</NavLink>,
            },
          ]}
        />
      </Sider>
      <Layout>
        <StyledHeader>윈소프트 인스타그램 봇</StyledHeader>
        <StyledContent>
          <Routes>
            <Route
              path="/"
              element={(
                <Tabs
                  defaultActiveKey="send-dm"
                  items={[
                    {
                      key: 'send-dm',
                      label: 'DM 보내기',
                      children: <SendDMForm />,
                    },
                    {
                      key: 'export-posts',
                      label: '게시물 엑셀 내보내기',
                      children: <ExportPostsXlsx />,
                    },
                  ]}
                />
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
