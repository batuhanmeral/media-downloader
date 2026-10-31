import { NextResponse, type NextRequest } from "next/server";
import { isLocalHost } from "@/lib/local-host";

const FORBIDDEN_STATUS = 403;

// DNS rebinding'e karşı: sadece localhost Host başlığıyla gelen istekler işlenir
export function proxy(request: NextRequest): NextResponse {
  if (isLocalHost(request.headers.get("host"))) return NextResponse.next();
  return new NextResponse("Forbidden", { status: FORBIDDEN_STATUS });
}

export const config = { matcher: "/:path*" };
