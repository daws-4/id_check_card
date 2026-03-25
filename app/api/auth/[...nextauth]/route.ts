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
        password: { label: "Password", type: "password" },
        portalType: { label: "Portal", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        await connectDB();

        let roleFilter = {};
        if (credentials.portalType === 'user') {
          roleFilter = { role: 'user' };
        } else if (credentials.portalType === 'admin') {
          roleFilter = { role: { $in: ['org_admin', 'superadmin'] } };
        }

        const user = await User.findOne({ email: credentials.email, ...roleFilter });
        
        if (!user) {
          // Si no encuentra pero el email existe en otro rol, podemos avisar
          const wrongRoleUser = await User.findOne({ email: credentials.email });
          if (wrongRoleUser) {
             if (credentials.portalType === 'user') throw new Error('Por favor, inicia sesión en el portal de administración.');
             if (credentials.portalType === 'admin') throw new Error('No tienes permisos de administrador. Ve al portal de usuarios.');
          }
          throw new Error('Credenciales incorrectas');
        }

        const isMatch = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isMatch) {
          throw new Error('Credenciales incorrectas');
        }

        // Check if user has admin role in any organization
        const memberships = await Membership.find({ 
          user_id: user._id, 
          role: 'admin' 
        });

        const orgIds = memberships.map(m => m.organization_id.toString());

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          orgs: orgIds
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.orgs = (user as any).orgs;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).orgs = token.orgs;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login'
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
