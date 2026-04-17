import serverlessExpress from '@vendia/serverless-express';

let cachedServer: any;

const handler = async (event: any, context: any) => {
  if (!cachedServer) {
    // Dynamic import to avoid TypeScript trying to resolve dist/ during local build
    const { bootstrap } = await import('../../dist/src/lambda');
    const app = await bootstrap();
    cachedServer = serverlessExpress({ app });
  }
  return cachedServer(event, context);
};

export { handler };
