import { getChatGPTUser } from './chatgpt-auth';
import SiteClient from './site-client';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  return <SiteClient user={user} />;
}
