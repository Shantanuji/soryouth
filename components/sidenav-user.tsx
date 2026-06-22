
import { verifySession } from '@/lib/auth';
import { SidenavUserClient } from './sidenav-user-client';

export async function SidenavUser() {
  const session = await verifySession();
  return <SidenavUserClient user={session} />;
}
