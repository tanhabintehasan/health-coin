import serverlessExpress from '@vendia/serverless-express';
import * as path from 'path';

let cachedServer: any;

const handler = async (event: any, context: any) => {
  // Netlify Functions invoked via rewrite often set event.path to the path
  // AFTER the function endpoint (e.g. /v1/auth/otp/send) instead of the
  // original request path (/api/v1/auth/otp/send). We reconstruct it here.
  const originalPath = event.path;
  if (!event.path.startsWith('/api')) {
    event.path = '/api' + event.path;
  }

  console.log('[NETLIFY FUNCTION]', JSON.stringify({
    originalPath,
    fixedPath: event.path,
    rawUrl: event.rawUrl,
    httpMethod: event.httpMethod,
  }));

  if (!cachedServer) {
    const candidates = [
      path.join(process.cwd(), 'apps/api/dist/src/lambda'),
      path.join(process.cwd(), 'dist/src/lambda'),
      '../../dist/src/lambda',
      '../../apps/api/dist/src/lambda',
    ];

    let bootstrap: any;
    let lastErr: any;

    for (const candidate of candidates) {
      try {
        console.log('[NETLIFY FUNCTION] Trying bootstrap path:', candidate);
        const mod = await import(candidate);
        bootstrap = mod.bootstrap;
        if (bootstrap) {
          console.log('[NETLIFY FUNCTION] Bootstrap loaded from:', candidate);
          break;
        }
      } catch (err: any) {
        lastErr = err;
        console.log('[NETLIFY FUNCTION] Failed to load from', candidate, '-', err.message);
      }
    }

    if (!bootstrap) {
      console.error('[NETLIFY FUNCTION] Could not load bootstrap. Last error:', lastErr?.message);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Function bootstrap failed',
          detail: lastErr?.message || 'Unknown error',
          paths: candidates,
          cwd: process.cwd(),
        }),
      };
    }

    const app = await bootstrap();
    cachedServer = serverlessExpress({ app });
  }

  return cachedServer(event, context);
};

export { handler };
