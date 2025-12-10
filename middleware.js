import { NextResponse } from "next/server";
import { verifyAccessToken } from "./lib/jwt";

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    const protectedRoutes = [
        { path: "/api/admin", role: "admin" },
        { path: "/api/delivery", role: "delivery_boy" },
        { path: "/api/customer", role: "customer" },
    ];

    const matched = protectedRoutes.find(r => pathname.startsWith(r.path));

    if (!matched) return NextResponse.next();

    // 1️⃣ Try Authorization header first
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    // 2️⃣ Fallback → accessToken cookie
    if (!token) {
        token = request.cookies.get("accessToken")?.value;
    }

    if (!token) {
        return NextResponse.json(
            { success: false, message: "Unauthorized. No token provided." },
            { status: 401 }
        );
    }

    console.log("AUTH HEADER TOKEN:", authHeader);
    console.log("COOKIE TOKEN:", request.cookies.get("accessToken")?.value);
    console.log("FINAL TOKEN USED:", token);


    try {
        const payload = await verifyAccessToken(token);

        if (payload.role !== matched.role) {
            return NextResponse.json(
                { success: false, message: "Forbidden. Role mismatch." },
                { status: 403 }
            );
        }

        const headers = new Headers(request.headers);
        headers.set("x-user-id", payload.user_id);
        headers.set("x-user-role", payload.role);

        return NextResponse.next({ request: { headers } });

    } catch (err) {
        return NextResponse.json(
            { success: false, message: "Unauthorized. Invalid or expired token." },
            { status: 401 }
        );
    }
}

export const config = {
    matcher: [
        "/api/admin/:path*",
        "/api/delivery/:path*",
        "/api/customer/:path*",
    ],
};
