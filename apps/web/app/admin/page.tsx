"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function AdminPage() {
  return (
    <Suspense>
      <AdminRedirect />
    </Suspense>
  );
}

function AdminRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ward = searchParams.get("ward");

  useEffect(() => {
    router.replace(`/admin/members${ward ? `?ward=${ward}` : ""}`);
  }, [ward, router]);

  return null;
}
