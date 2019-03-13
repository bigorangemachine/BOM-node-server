import appSetup, { initalizeFileDeps } from './src/setup';

initalizeFileDeps()
  .then(appSetup)
  .then(console.log.call(console, 'Post Install Completed Successfully', '\n'))
  .catch(err => {
    console.error('Post Install Error', err);
    process.exit(1);
    throw err;
  });
