import { Button, message, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { checkLoginStatus, workflowInstagramLogin, workflowInstagramLogout } from '../api'

interface RequireInstagramLoginProps {
  children: React.ReactNode
}

const RequireInstagramLogin: React.FC<RequireInstagramLoginProps> = ({ children }) => {
  return <>{children}</>
}

export default RequireInstagramLogin
