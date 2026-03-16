import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/config/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { Membership } from "@/models/Membership";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isMatch) {
          throw new Error('Invalid email or password');
        }

        // Check if user has admin role in any organization
        const adminMembership = await Membership.findOne({ 
          user_id: user._id, 
          role: 'admin' 
        });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isAdmin: !!adminMembership
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // signIn: '/login' // Custom login page can be added later
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
