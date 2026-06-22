import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect all root traffic to the unified login portal
  redirect('/login');
}
