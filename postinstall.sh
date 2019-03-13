#!/bin/sh

if [ "$SKIPPOSTINSTALL" != "true" ]; then
  SKIPPOSTINSTALL=true npm install --only=dev --no-optional;
  npm run build:postinstall;
  node dist/postinstall;
  rm dist/postinstall.js;
  if [ "$NODE_ENV" != "local" ]; then
    npm run db:migrate;
    SKIPPOSTINSTALL=true npm prune --production;
  else
    SKIPPOSTINSTALL=true npm install --optional;
    export localConfigPath=".env.${NODE_ENV}"
    if [ ! -f "${localConfigPath}" ]; then
      echo "File '${localConfigPath}' not found!";
      exit 1;
    fi
    npm run db:setup:local; # runs `npm run db:migrate;``
  fi
fi
