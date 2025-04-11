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
        profilePicture: '',
      }}
      onSubmit={async (data) => {
        console.log(data)
        return { success: true }
      }}

    />
  )
}

export default Page
