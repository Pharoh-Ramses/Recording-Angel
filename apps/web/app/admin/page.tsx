"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ward = searchParams.get("ward");

  useEffect(() => {
    router.replace(`/admin/members${ward ? `?ward=${ward}` : ""}`);
  }, [ward, router]);

  return null;
}
