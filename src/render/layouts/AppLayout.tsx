import { Layout } from 'antd'
import React from 'react'
import styled from 'styled-components'
import AppSidebar from './AppSidebar'

const { Content } = Layout

const StyledLayout = styled(Layout)`
  width: 100%;
  min-height: 100vh;
  height: 100vh;
`

const StyledContent = styled(Content)`
  margin: 0;
  padding: 0;
  background: #fff;
  min-height: 100vh;
  height: 100vh;
  display: flex;
  align-items: start;
  justify-content: start;
`

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <StyledLayout>
      <AppSidebar />
      <Layout>
        <StyledContent>{children}</StyledContent>
      </Layout>
    </StyledLayout>
  )
}

export default AppLayout
