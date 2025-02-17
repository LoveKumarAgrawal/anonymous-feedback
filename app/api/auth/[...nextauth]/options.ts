import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import { User as NextAuthUser } from "next-auth";

interface User {
    _id: string;
    username: string;
    email: string;
    password: string;
    isAcceptingMessage: boolean;
    __v: number;
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials: any): Promise <NextAuthUser | null>{
                await dbConnect()
                try {
                    const user: User | null = await UserModel.findOne({ email: credentials?.email })

                    if (!user) {
                        throw new Error("No user found with this email")
                    }
                    if(!credentials?.password) {
                        return null
                    }
                    const isPasswordCorrect = await bcrypt.compare(credentials?.password, user.password)
                    if (isPasswordCorrect) {
                        return {
                            ...user,
                            isAcceptingMessages: user.isAcceptingMessage,
                            username: user.username,
                            id: user._id.toString(),
                        }
                    } else {
                        throw new Error("Invalid Password")
                    }
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        throw new Error(error.message);
                    }
                    throw new Error("An unexpected error occurred");
                }
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token) {
                session.user._id = token._id
                session.user.isAcceptingMessages = token.isAcceptingMessages
                session.user.username = token.username
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token._id = user.id
                token.isAcceptingMessages = user.isAcceptingMessages
                token.username = user.username
            }
            return token
        }
    },
    pages: {
        signIn: '/sign-in'
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
}
