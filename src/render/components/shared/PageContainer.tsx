import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
`

const Title = styled.h1`
  margin-bottom: 24px;
  color: #333;
  font-size: 24px;
  font-weight: 600;
`

const Content = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`

interface PageContainerProps {
  title: string
  children: React.ReactNode
}

const PageContainer: React.FC<PageContainerProps> = ({ title, children }) => {
  return (
    <Container>
      <Title>{title}</Title>
      <Content>{children}</Content>
    </Container>
  )
}

export default PageContainer
