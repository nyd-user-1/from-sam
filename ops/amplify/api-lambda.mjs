// from-sam's /api, as one Lambda behind a function URL (2026-09-29).
//
// The four routes the app needs are Vercel-style (req, res) handlers; this
// adapter gives each the two objects from a function-URL event and streams
// what it writes straight back through Lambda's response streaming, so the
// chat's server-sent events reach the browser as they are produced. Bedrock
// is reached on the function's execution role: BEDROCK_API_KEY is not set,
// so the SDK's default chain applies. CloudFront stands in front (the
// account does not allow public function URLs) and signs each request.
import chat from "../../api/chat.ts"
import chatSessions from "../../api/chat-sessions.ts"
import feed from "../../api/feed.ts"
import sendApplication from "../../api/send-application.ts"

const ROUTES = {
  "/api/chat": chat,
  "/api/chat-sessions": chatSessions,
  "/api/feed": feed,
  "/api/send-application": sendApplication,
}

// The site and the API are different origins when the browser calls this
// directly; the Amplify hostnames are the only callers allowed.
const ORIGIN_OK = /^https:\/\/([a-z0-9-]+\.)*amplifyapp\.com$|^http:\/\/localhost(:\d+)?$/

/* global awslambda */
export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const method = event.requestContext?.http?.method ?? "GET"
  const path = event.rawPath ?? "/"
  const origin = event.headers?.origin ?? ""
  const cors = ORIGIN_OK.test(origin)
    ? {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type, x-amz-content-sha256",
        "access-control-max-age": "600",
        vary: "origin",
      }
    : {}

  let status = 200
  const headers = { ...cors }
  let stream = null
  const begin = () => {
    if (stream) return
    stream = awslambda.HttpResponseStream.from(responseStream, { statusCode: status, headers })
  }

  const res = {
    get headersSent() {
      return stream !== null
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = String(value)
      return res
    },
    writeHead(code, extra) {
      status = code
      for (const [name, value] of Object.entries(extra ?? {})) headers[name.toLowerCase()] = String(value)
      begin()
      return res
    },
    status(code) {
      status = code
      return res
    },
    json(value) {
      headers["content-type"] = "application/json"
      begin()
      stream.write(JSON.stringify(value))
      stream.end()
      return res
    },
    send(text) {
      begin()
      stream.write(String(text))
      stream.end()
      return res
    },
    write(chunk) {
      begin()
      stream.write(chunk)
      return true
    },
    end(chunk) {
      begin()
      if (chunk) stream.write(chunk)
      stream.end()
      return res
    },
  }

  if (method === "OPTIONS") return res.status(204).end()

  const route = ROUTES[path]
  if (!route) return res.status(404).json({ error: "not here" })

  let raw = event.body ?? ""
  if (event.isBase64Encoded && raw) raw = Buffer.from(raw, "base64").toString("utf8")
  let body = {}
  try {
    body = raw ? JSON.parse(raw) : {}
  } catch {
    body = {}
  }

  const req = { method, headers: event.headers ?? {}, query: event.queryStringParameters ?? {}, body }

  try {
    await route(req, res)
  } catch (error) {
    if (!stream) res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    else res.end()
  }
  if (!stream) res.end()
})
