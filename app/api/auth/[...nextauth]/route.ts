import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/config/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { Membership } from "@/models/Membership";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    }),
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

        // Validar que el usuario haya completado su registro
        if (user.status === 'pending') {
          throw new Error('Tu cuenta está pendiente de activación. Revisa tu correo electrónico para completar tu registro.');
        }

        if (!user.password_hash) {
          throw new Error('Debes completar tu registro primero. Revisa tu correo electrónico.');
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
          orgs: orgIds,
          theme_preference: user.theme_preference
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        const existingUser = await User.findOne({ email: user.email });
        if (!existingUser) {
          // Si el usuario no existe, se rechaza la autorización
          return false;
        }

        // Auto-activación si estaba pendiente
        if (existingUser.status === 'pending') {
          existingUser.status = 'active';
        }

        // Registrar el proveedor si no lo tiene
        if (!existingUser.auth_providers?.includes(account.provider)) {
          existingUser.auth_providers = existingUser.auth_providers || [];
          existingUser.auth_providers.push(account.provider);
        }
        await existingUser.save();
        return true;
      }
      return true; // Para CredentialsProvider devuelve true por defecto si authorize() no arrojó error
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.theme_preference = dbUser.theme_preference;
          const memberships = await Membership.find({ user_id: dbUser._id, role: 'admin' });
          token.orgs = memberships.map(m => m.organization_id.toString());
        }
      } else if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.orgs = (user as any).orgs;
        token.theme_preference = (user as any).theme_preference;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).orgs = token.orgs;
        (session.user as any).theme_preference = token.theme_preference;
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
  },
};

const useSecure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;

const handler = NextAuth({
  ...authOptions,
  useSecureCookies: useSecure,
} as any);

export { handler as GET, handler as POST };
