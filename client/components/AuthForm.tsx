'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { DefaultValues, useForm, UseFormReturn, SubmitHandler, FieldValues, Path } from 'react-hook-form'
import { z, ZodType } from 'zod'

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { FIELD_NAMES } from '@/constants'


interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean, errror?: string }>;
  type: 'SIGN_UP' | 'SIGN_IN';
}


const AuthForm = <T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  type
}: Props<T>) => {
  const isSignIn = type === 'SIGN_IN'

  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  })

  const handleSubmit: SubmitHandler<T> = async (data) => { }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-white">
        {isSignIn ? "Welcome back to the archive" : "Sign up at the gate"}
      </h1>
      <p className="text-light-100">
        {isSignIn ? 'Access your records' : 'Keep track and take ownership of your talks and watch your progress on your path towards becoming a better desciple of Jesus Christ. A fair warning, it is very embarassing to read what you have said, especially in the beggining. '}
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full">
          {Object.keys(defaultValues).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="capitalize">{FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}</FormLabel>
                  <FormControl>
                    <Input placeholder="shadcn" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is your public display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          ))}

          <Button type="submit">Submit</Button>
        </form>
      </Form>
      <p className="text-center text-base font-medium">
        {isSignIn ? "Don't have an account? " : "Already have an account? "}
        <Link className="font-bold text-primary" href={isSignIn ? "/sign-up" : "/sign-in"}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Link>
      </p>
    </div>
  )
}

export default AuthForm
