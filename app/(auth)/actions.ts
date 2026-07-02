
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createSession, deleteSession, hashPassword, comparePassword } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: 'Invalid email or password.' };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { error: 'Invalid email or password.' };
    }
    
    if (!user.isActive) {
      return { error: 'Your account is inactive. Please contact an administrator.' };
    }

    const passwordsMatch = await comparePassword(password, user.password);
    if (!passwordsMatch) {
      return { error: 'Invalid email or password.' };
    }
    
    await createSession(user.id, user.name, user.email, user.role, user.viewPermission, user.profileImage);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { presenceStatus: 'Online' },
    });
    
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }

  redirect('/dashboard');
}

export async function signup(prevState: any, formData: FormData) {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
      return { error: "Self-registration is disabled. Please contact an administrator to create an account." };
  }

  const validatedFields = signupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
      const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
      return { error: `Invalid fields: ${errorMessages}` };
  }

  const { name, email, phone, password } = validatedFields.data;

  try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
          return { error: 'User with this email already exists.' };
      }

      const hashedPassword = await hashPassword(password);
      
      const adminRoleName = 'Admin';
      
      // Ensure 'Admin' role exists in CustomSettings
      await prisma.customSetting.upsert({
          where: { type_name: { type: 'USER_ROLE', name: adminRoleName } },
          update: {},
          create: { type: 'USER_ROLE', name: adminRoleName },
      });

      await prisma.user.create({
          data: {
              name,
              email,
              phone,
              password: hashedPassword,
              role: adminRoleName, // The first user is always an Admin
              isActive: true, // First user is active
          },
      });
  } catch (error) {
      console.error(error);
      return { error: 'Could not create user. Please try again.' };
  }
  
  revalidatePath('/login');
  return { success: true, message: `Admin account for '${name}' created successfully. Please login.` };
}

export async function logout() {
  try {
    const { verifySession } = await import('@/lib/auth');
    const session = await verifySession();
    if (session?.userId) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { presenceStatus: 'Offline', lastSeen: new Date() },
      });
      await prisma.auditTimeline.create({
        data: {
          userId: session.userId,
          eventType: 'Logout',
          details: 'Standard Logout',
        },
      });
    }
  } catch (e) {
    console.error('Logout presence tracking failed:', e);
  }
  await deleteSession();
  revalidatePath('/', 'layout');
  redirect('/login');
}
