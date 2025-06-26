import { UploadOutlined } from '@ant-design/icons'
import { Button, Form, message, Upload, Table } from 'antd'
import React, { useState } from 'react'
import { sendDmTo } from '../api'
import ChallengeForm from './ChallengeForm'

const SendDMForm: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [challengeRequired, setChallengeRequired] = useState(false)

  return (
    <div>
      {challengeRequired ? (
        <ChallengeForm onSuccess={() => setChallengeRequired(false)} />
      ) : (
        <Form
          layout="vertical"
          onFinish={async () => {
            if (!file) {
              message.warning('엑셀 파일을 업로드해주세요.')
              return
            }
            setLoading(true)
            setResult(null)
            try {
              const res = await sendDmTo(file)
              setResult(res)
              if (res.challengeRequired) {
                setChallengeRequired(true)
              } else if (res.success) {
                message.success('DM 전송이 완료되었습니다.')
              } else {
                message.error('DM 전송에 실패했습니다.')
              }
            } catch (e: any) {
              const errorMessage = e?.message || 'DM 전송에 실패했습니다.'
              message.error(`에러: ${errorMessage}`)
            } finally {
              setLoading(false)
            }
          }}
          style={{ maxWidth: 400 }}
        >
          <Form.Item label="엑셀 파일 업로드" required>
            <Upload
              beforeUpload={file => {
                setFile(file)
                return false
              }}
              maxCount={1}
              accept=".xlsx"
              showUploadList={!!file}
            >
              <Button icon={<UploadOutlined />}>엑셀 파일 선택</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              DM 보내기
            </Button>
          </Form.Item>
        </Form>
      )}
      {result && result.results && (
        <div style={{ marginTop: 24 }}>
          <b>DM 전송 결과</b>
          <Table
            dataSource={result.results.map((r: any, idx: number) => ({
              key: idx,
              targetId: (
                <a href={`https://instagram.com/${r.유저ID}`} target="_blank" rel="noopener noreferrer">
                  {r.fullName} ({r.유저ID})
                </a>
              ),
              success: r.dmResult && !r.dmResult.error ? '성공' : '실패',
              error: r.dmResult?.error || '',
            }))}
            columns={[
              { title: '대상 아이디', dataIndex: 'targetId', key: 'targetId' },
              { title: 'DM 결과', dataIndex: 'success', key: 'success' },
              { title: '에러 메시지', dataIndex: 'error', key: 'error' },
            ]}
            pagination={false}
            style={{ marginTop: 12 }}
            size="small"
          />
        </div>
      )}
    </div>
  )
}

export default SendDMForm
