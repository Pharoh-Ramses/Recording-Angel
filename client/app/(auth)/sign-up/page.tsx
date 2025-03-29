'use client'

import AuthForm from '@/components/AuthForm'
import { singUpSchema } from '@/lib/validations'
import React from 'react'

const Page = () => {
  return (
    <AuthForm 
      type="SIGN_UP"
      schema={singUpSchema}
      defaultValues={{
        email: '',
        password: '',
        stake: '',
        ward: '',
        fullName: '',
      }}
      onSubmit={() => {}}
    />
  )
}

export default Page
