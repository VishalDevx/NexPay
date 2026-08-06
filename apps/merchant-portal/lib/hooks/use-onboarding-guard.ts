"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useOnboardingGuard() {
  const { merchant, loading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !token || !merchant) return;

    const isOnboardingRoute =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/");

    if (merchant.kycStatus === "VERIFIED" && isOnboardingRoute) {
      router.replace("/dashboard");
      return;
    }

    if (
      ["NOT_SUBMITTED", "PENDING", "REJECTED"].includes(merchant.kycStatus) &&
      !isOnboardingRoute
    ) {
      router.replace("/onboarding");
    }
  }, [merchant, loading, token, pathname, router]);
}
