import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    name: string
    email: string
    profilePicture?: string
  }

  interface Session {
    user: User
  }
}
