import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return Response.json(
        { message: "Email and password required" }, // ✅ fixed
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return Response.json(
        { message: "User already exists" }, // ✅ fixed
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: name || "", // ✅ prevent null issues
        email,
        password: hashedPassword,
      },
    })

    return Response.json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (err) {
    console.error("SIGNUP ERROR:", err) // ✅ log real error

    return Response.json(
      { message: "Internal server error" }, // ✅ fixed
      { status: 500 }
    )
  }
}