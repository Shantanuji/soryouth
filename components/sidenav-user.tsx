
import { verifyServerSession } from '@/lib/auth';
import { SidenavUserClient } from './sidenav-user-client';

export async function SidenavUser() {
  const session = await verifyServerSession();
  return <SidenavUserClient user={session} />;
}
