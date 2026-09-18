import app from 'vinext/server/fetch-handler';
import { dispatchDueDailyEmails } from '@/lib/daily-email';

type RuntimeEnv = Parameters<typeof dispatchDueDailyEmails>[0];

export default {
  fetch(request: Request, env: RuntimeEnv, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  scheduled(
    _controller: ScheduledController,
    env: RuntimeEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(dispatchDueDailyEmails(env));
  },
};
