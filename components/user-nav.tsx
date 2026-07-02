
import { verifyServerSession } from '@/lib/auth';
import { UserNavClient } from './user-nav-client';

export async function UserNav() {
  const session = await verifyServerSession();
  return <UserNavClient user={session} />;
}
