'use client'

import AuthForm from '@/components/AuthForm'
import { signUp } from '@/lib/actions/auth'
import { signUpSchema } from '@/lib/validations'
import React from 'react'

const Page = () => {
  return (
    <AuthForm
      type="SIGN_UP"
      schema={signUpSchema}
      defaultValues={{
        email: '',
        password: '',
        stake: 0,
        ward: 0,
        fullName: '',
        profilePicture: '',
      }}
      onSubmit={signUp}

    />
  )
}

export default Page
