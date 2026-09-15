import { getChatGPTUser } from './chatgpt-auth';

export const ADMIN_EMAIL = 'rox062212@gmail.com';

export async function getAdminUser() {
  const user = await getChatGPTUser();
  return user?.email.toLowerCase() === ADMIN_EMAIL ? user : null;
}
