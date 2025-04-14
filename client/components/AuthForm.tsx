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
import { FIELD_NAMES, FIELD_TYPES } from '@/constants'
import Selection from './Selection'
import ImageUpload from './ImageUpload'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'


interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean, error?: string }>;
  type: 'SIGN_UP' | 'SIGN_IN';
}


const AuthForm = <T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  type
}: Props<T>) => {
  const router = useRouter()
  const isSignIn = type === 'SIGN_IN'

  const form: UseFormReturn<T> = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
  })
  const handleSubmit: SubmitHandler<T> = async (data) => {
    const result = await onSubmit(data);
    if (result.success) {
      toast("Success", {
        description: isSignIn ? 'You have successfully signed in.' : 'You have successfully signed up.'
      });
      router.push('/dashboard')

    } else {
      toast.error(`Error ${isSignIn ? 'Signing in' : 'Signing up'}`, {
        description: result.error ?? "An error occured"
      });
    }
  }


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
                    {field.name === "profilePicture" ? (
                      <ImageUpload onFileChange={field.onChange} />
                    ) : field.name === "stake" || field.name === "ward" ? (
                      <Selection fieldName={field.name} value={field.value} onChange={field.onChange} />) : (
                      <Input required type={FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]} {...field} className="form-input" />)}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          ))}

          <Button type="submit" className="form-btn">{isSignIn ? "Sign in" : "Sign up"}</Button>
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
