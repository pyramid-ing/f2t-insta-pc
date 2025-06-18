import { Button, message, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { checkLoginStatus, workflowInstagramLogin } from '../api'

interface RequireInstagramLoginProps {
  children: React.ReactNode
}

const RequireInstagramLogin: React.FC<RequireInstagramLoginProps> = ({ children }) => {
  const [loginStatus, setLoginStatus] = useState<'checking' | 'loggedIn' | 'needLogin'>('checking')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    handleCheckLoginStatus()
  }, [])

  const handleCheckLoginStatus = async () => {
    setLoading(true)
    try {
      const data = await checkLoginStatus()
      setLoginStatus(data.isLoggedIn ? 'loggedIn' : 'needLogin')
    }
    catch {
      setLoginStatus('needLogin')
    }
    finally {
      setLoading(false)
    }
  }

  const handleOpenLogin = async () => {
    setLoading(true)
    try {
      const result = await workflowInstagramLogin()
      if (result.success) {
        message.success('로그인 완료!')
        setLoginStatus('loggedIn')
      }
      else {
        message.info(result.message || '로그인에 실패했습니다.')
      }
    }
    catch {
      message.error('로그인 시도에 실패했습니다.')
    }
    finally {
      setLoading(false)
    }
  }

  if (loginStatus === 'checking') {
    return (
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Spin />
        {' '}
        로그인 상태 확인 중...
      </div>
    )
  }

  if (loginStatus !== 'loggedIn') {
    return (
      <div style={{ maxWidth: 350, margin: '0 auto', marginTop: 40 }}>
        <div style={{ marginBottom: 12 }}>로그인이 필요합니다.</div>
        <Button type="primary" onClick={handleOpenLogin} loading={loading} block>
          인스타그램 로그인
        </Button>
      </div>
    )
  }

  return <>{children}</>
}

export default RequireInstagramLogin
