import React from 'react'

interface RequireInstagramLoginProps {
  children: React.ReactNode
}

const RequireInstagramLogin: React.FC<RequireInstagramLoginProps> = ({ children }) => {
  return <>{children}</>
}

export default RequireInstagramLogin
