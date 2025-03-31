'use client'

import AuthForm from '@/components/AuthForm'
import { singInSchema } from '@/lib/validations'
import React from 'react'

const Page = () => {
  return (
    <AuthForm 
      type="SIGN_IN"
      schema={singInSchema}
      defaultValues={{
        email: '',
        password: '',
      }}
      onSubmit={async (data) => {
        console.log(data)
        return { success: true }
      }}
    />
  )
}

export default Page
