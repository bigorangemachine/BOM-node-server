import AppFactory from './src/server';
import setupApp from './src/setup';

setupApp() // setup caches as per postinstall.js
  .then(() => AppFactory({
    // configure the app by passing configuration(s)
    ...(process.env.REQUEST_LOGGING ? { useLogging: process.env.REQUEST_LOGGING } : {})
  }))
  .then((res) => {
    const sep = '\n\t';
    process.env.VERBOSE && console.log(`AppFactory started successfully@${sep}`,
      `STAMP: ${new Date().toString()}${sep}`,
      `ISOSTAMP: ${new Date().toISOString()}${sep}`,
      `MICROTIME: ${new Date().getTime()}`
    );
    return res;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
