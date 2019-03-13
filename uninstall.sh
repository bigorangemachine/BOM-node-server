#!/bin/sh

if [ "$NODE_ENV" != "production" ]; then
  SKIPPOSTINSTALL=true npm install --only=dev --no-optional;
  npm run db:drop;
  rm -rf _dist/ _cache/ node_modules/;
else
  echo "Do not teardown production";
  exit 1;
fi

echo "S3 Storage is untouched\n";
