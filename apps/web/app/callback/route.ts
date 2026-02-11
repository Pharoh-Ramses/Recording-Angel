import { handleAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

export const GET = handleAuth({
  onError: async ({ error }) => {
    console.error("AuthKit callback error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  },
});
