import React, { useState } from 'react'
import { Input, Button, message } from 'antd'
import { verifyChallenge } from '../api'

interface ChallengeFormProps {
  onSuccess: () => void
}

const ChallengeForm: React.FC<ChallengeFormProps> = ({ onSuccess }) => {
  const [securityCode, setSecurityCode] = useState('')

  const handleChallengeSubmit = async () => {
    try {
      const res = await verifyChallenge(securityCode)
      if (res.success) {
        message.success('챌린지 해결 성공')
        onSuccess()
      } else {
        message.error('챌린지 해결 실패')
      }
    } catch (e: any) {
      message.error(e.message || '챌린지 해결 실패')
    }
  }

  return (
    <div>
      <Input
        placeholder="보안 코드를 입력하세요"
        value={securityCode}
        onChange={e => setSecurityCode(e.target.value)}
      />
      <Button onClick={handleChallengeSubmit}>코드 제출</Button>
    </div>
  )
}

export default ChallengeForm 