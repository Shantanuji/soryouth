import { verifySession } from '@/lib/auth';
import { ToolsDropdownClient } from './tools-dropdown-client';

export async function TopbarSettings() {
  const session = await verifySession();
  return <ToolsDropdownClient userRole={session?.role} />;
}
