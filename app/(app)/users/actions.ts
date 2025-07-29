

'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hashPassword, verifySession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { User, UserRole, RolePermission, ViewPermission } from '@/types';
import { getUserRoles } from '@/app/(app)/settings/actions';
import { NAV_ITEMS, TOOLS_NAV_ITEMS } from '@/lib/constants';

function mapPrismaUserToUserType(prismaUser: any): User {
    return {
      id: prismaUser.id,
      name: prismaUser.name,
      email: prismaUser.email,
      phone: prismaUser.phone,
      role: prismaUser.role,
      isActive: prismaUser.isActive,
      deviceId: prismaUser.deviceId,
      viewPermission: prismaUser.viewPermission,
      createdAt: prismaUser.createdAt.toISOString(),
    };
  }

const getUserSchema = (roles: string[]) => z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  role: z.string().refine(val => roles.includes(val), { message: "Please select a valid role." }),
});

const getAddUserSchema = (roles: string[]) => getUserSchema(roles).extend({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const getEditUserSchema = (roles: string[]) => getUserSchema(roles).extend({
  password: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});


export async function getUsers(): Promise<User[]> {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        return users.map(mapPrismaUserToUserType);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return [];
    }
}

export async function addUser(prevState: any, formData: FormData) {
  const roles = (await getUserRoles()).map(r => r.name);
  const addUserSchema = getAddUserSchema(roles);
  const validatedFields = addUserSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
    return { error: `Invalid fields: ${errorMessages}` };
  }
  
  const { name, email, phone, password, role } = validatedFields.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: 'User with this email already exists.' };
    }

    const hashedPassword = await hashPassword(password);
    
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role,
        isActive: true, // New users are active by default
        viewPermission: 'ASSIGNED', // Default to only seeing assigned items
      },
    });

  } catch (error) {
    console.error(error);
    return { error: 'Could not create user. Please try again.' };
  }
  
  revalidatePath('/users');
  return { success: true, message: `User '${name}' created successfully with the role '${role}'.` };
}

export async function updateUser(userId: string, formData: FormData) {
    const roles = (await getUserRoles()).map(r => r.name);
    const editUserSchema = getEditUserSchema(roles);
    const data = Object.fromEntries(formData.entries());
    const validatedFields = editUserSchema.safeParse(data);
    
    if (!validatedFields.success) {
        const errorMessages = validatedFields.error.errors.map(e => e.message).join(', ');
        return { success: false, error: `Invalid fields: ${errorMessages}` };
    }
    
    const { password, ...userData } = validatedFields.data;
    const updateData: Partial<User & {password?: string}> = { ...userData };
    
    try {
        if (password) {
            updateData.password = await hashPassword(password);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });
        
        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
        return { success: false, error: 'An unexpected error occurred while updating the user.' };
    }
}

export async function toggleUserStatus(userId: string, currentStatus: boolean): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }
    if (session.userId === userId) {
        return { success: false, error: 'You cannot change the status of your own account.' };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isActive: !currentStatus },
        });
        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error(`Failed to toggle status for user ${userId}:`, error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function toggleUserViewPermission(userId: string, currentPermission: ViewPermission): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId || session.role !== 'Admin') {
        return { success: false, error: 'Only admins can change view permissions.' };
    }

    try {
        const newPermission: ViewPermission = currentPermission === 'ALL' ? 'ASSIGNED' : 'ALL';
        await prisma.user.update({
            where: { id: userId },
            data: { viewPermission: newPermission },
        });
        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error(`Failed to toggle view permission for user ${userId}:`, error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }
    if (session.userId === userId) {
        return { success: false, error: 'You cannot delete your own account.' };
    }

    try {
        await prisma.user.delete({
            where: { id: userId },
        });
        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete user:", error);
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
             return { success: false, error: 'Cannot delete user. They are still assigned to leads, clients, or other records. Please reassign them first.' };
        }
        return { success: false, error: 'An unexpected error occurred while deleting the user.' };
    }
}


export async function getUserPermissions(roleName: string): Promise<RolePermission[]> {
  if (roleName === 'Admin') {
    // Admins have access to everything
    return [...NAV_ITEMS, ...TOOLS_NAV_ITEMS].map(item => ({
      id: item.href,
      roleName: 'Admin',
      navPath: item.href,
    }));
  }
  
  try {
    const permissions = await prisma.rolePermission.findMany({
      where: { roleName: roleName },
    });
    return permissions;
  } catch (error) {
    console.error(`Failed to fetch permissions for role ${roleName}:`, error);
    return [];
  }
}


export async function updateRolePermissions(roleName: string, permissions: { navPath: string, allowed: boolean }[]) {
  try {
    await prisma.$transaction(async (tx) => {
      // First, delete all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleName: roleName },
      });

      // Then, create new permissions for the allowed paths
      const allowedPermissions = permissions.filter(p => p.allowed);
      if (allowedPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allowedPermissions.map(p => ({
            roleName: roleName,
            navPath: p.navPath,
          })),
        });
      }
    });
    
    revalidatePath('/users', 'layout'); // Revalidate the entire user section
    return { success: true };

  } catch (error) {
    console.error(`Failed to update permissions for role ${roleName}:`, error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
