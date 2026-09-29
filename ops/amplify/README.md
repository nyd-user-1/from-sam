# The API on Amplify

The static site on Amplify has no server, so the four functions the app
needs — `api/chat.ts`, `api/chat-sessions.ts`, `api/feed.ts`,
`api/send-application.ts` — run as the Lambda `from-sam-api` (us-east-1)
through `ops/amplify/api-lambda.mjs`, behind a function URL that only
CloudFront may call (the account blocks public function URLs). The site is
built with `VITE_API_BASE` set to the CloudFront domain, and `src/lib/api.ts`
prefixes every call with it. Replies stream.

Bedrock is reached on the function's execution role `from-sam-api-lambda`;
no API key is set. The database is the Neon `DATABASE_URL` and the email is
Resend, both as function environment variables.

Rebuild after a change under `api/`:

    npx esbuild ops/amplify/api-lambda.mjs --bundle --platform=node --format=esm \
      --target=node22 --main-fields=module,main --outfile=dist-lambda/index.mjs \
      --banner:js="import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);"
    (cd dist-lambda && zip -r ../function.zip index.mjs)
    aws lambda update-function-code --function-name from-sam-api --zip-file fileb://function.zip
