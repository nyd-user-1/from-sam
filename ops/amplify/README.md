# /api/chat on Amplify

The static site on Amplify has no server, so `api/chat.ts` runs as the Lambda
`livingston-chat` (us-east-1) behind the HTTP API `livingston-chat`
(`sf4eogams7`), and the Amplify app rewrites `/api/<*>` to that endpoint.
Bedrock is reached on the function's execution role `livingston-chat-lambda`;
no API key is set.

Rebuild after a change to `api/chat.ts`:

    npx esbuild ops/amplify/chat-lambda.mjs --bundle --platform=node --format=esm \
      --target=node22 --main-fields=module,main --outfile=dist-lambda/index.mjs \
      --banner:js="import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);"
    (cd dist-lambda && zip -r ../function.zip index.mjs)
    aws lambda update-function-code --function-name livingston-chat --zip-file fileb://function.zip

Only `/api/chat` is served; `chat-sessions`, `feed` and `send-application`
answer 404 until they are wired.
