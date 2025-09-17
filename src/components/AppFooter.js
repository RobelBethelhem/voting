import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://et.linkedin.com/in/robel-asfaw-534ba4236" target="_blank" rel="noopener noreferrer">
          Robel Asfaw
        </a>
        <span className="ms-1">&copy; 2024 Copy Right.</span>
      </div>
     
    </CFooter>
  )
}

export default React.memo(AppFooter)
