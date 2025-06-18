import { Button, Form, Input, InputNumber, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { checkLoginComplete, checkLoginStatus, exportPostsXlsx, workflowInstagramLogin } from '../api'

const ExportPostsXlsx: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [loginStatus, setLoginStatus] = useState<'checking' | 'loggedIn' | 'needLogin'>('checking')
  const [checkingLogin, setCheckingLogin] = useState(false)

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

  const handleCheckLoginComplete = async () => {
    setCheckingLogin(true)
    try {
      const data = await checkLoginComplete()
      if (data.success) {
        message.success('로그인 완료!')
        setLoginStatus('loggedIn')
      }
      else {
        message.info(data.message || '아직 로그인이 완료되지 않았습니다.')
      }
    }
    catch {
      message.error('로그인 완료 확인에 실패했습니다.')
    }
    finally {
      setCheckingLogin(false)
    }
  }

  if (loginStatus !== 'loggedIn') {
    return (
      <div style={{ maxWidth: 350, margin: '0 auto', marginTop: 40 }}>
        <div style={{ marginBottom: 12 }}>로그인이 필요합니다.</div>
        <Button type="primary" onClick={handleOpenLogin} loading={loading} block style={{ marginBottom: 8 }}>
          인스타그램 로그인
        </Button>
        <Button onClick={handleCheckLoginComplete} loading={checkingLogin} block>
          로그인 완료 확인
        </Button>
      </div>
    )
  }

  return (
    <Form
      layout="vertical"
      onFinish={async (values: { keyword: string, limit?: number }) => {
        setLoading(true)
        try {
          const blob = await exportPostsXlsx(values)
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'export.xlsx'
          document.body.appendChild(a)
          a.click()
          a.remove()
          window.URL.revokeObjectURL(url)
          message.success('엑셀 파일이 다운로드되었습니다.')
        }
        catch (e: any) {
          message.error(e.message || '엑셀 내보내기에 실패했습니다.')
        }
        finally {
          setLoading(false)
        }
      }}
      style={{ maxWidth: 400 }}
    >
      <Form.Item label="검색 키워드" name="keyword" rules={[{ required: true, message: '키워드를 입력하세요.' }]}>
        <Input placeholder="예: 여행" />
      </Form.Item>
      <Form.Item label="검색 개수 (선택)" name="limit">
        <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="기본값: 10" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          게시물 엑셀로 내보내기
        </Button>
      </Form.Item>
    </Form>
  )
}

export default ExportPostsXlsx
