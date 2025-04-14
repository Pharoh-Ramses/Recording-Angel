'use server'

import { eq } from "drizzle-orm";
import { db } from "@/database/drizzle";
import { users } from "@/database/schema";
import { hash } from "bcryptjs";
import { signIn } from "@/auth";

export const signInWithCredentials = async (params:Pick<AuthCredentials, "email" | "password">) => {
  const { email, password } = params;

  try {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      return { success: false, message: "Sign in error" };
    }

    return { success: true, message: "Signed in successfully" };
    
  } catch (error) {
    console.log(error, "Sign in error");
    return { success: false, message: "Sign in error" };
  }
};

export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, password, stake, ward, profilePicture } = params;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, message: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullName,
      email,
      password: hashedPassword,
      stake,
      ward,
      profilePicture: profilePicture ?? '',
    });

    await signInWithCredentials({ email, password });

    return { success: true, message: "User created successfully" };
    
  } catch (error) {
    console.log(error, "Sign up error");
    return { success: false, message: "Sign up error" };
  }
}
