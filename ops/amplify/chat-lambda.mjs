// livingston's /api/chat, as a Lambda behind an API Gateway HTTP API
// (2026-09-29). The function is a Vercel-style (req, res) handler; this
// adapter gives it those two objects from the HTTP API's v2 event and
// returns everything it wrote as one response. The SSE the browser parses
// arrives whole rather than as it is produced — the gateway buffers — which
// the client's reader handles the same way. Bedrock is reached on the
// function's execution role: BEDROCK_API_KEY is not set, so the SDK's
// default chain applies.
import chat from "../../api/chat.ts"

export const handler = async (event) => {
  const method = event.requestContext?.http?.method ?? "GET"
  const path = event.rawPath ?? "/"

  let status = 200
  const headers = {}
  const chunks = []
  let ended = false

  const res = {
    get headersSent() {
      return chunks.length > 0
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = String(value)
      return res
    },
    writeHead(code, extra) {
      status = code
      for (const [name, value] of Object.entries(extra ?? {})) headers[name.toLowerCase()] = String(value)
      return res
    },
    status(code) {
      status = code
      return res
    },
    json(value) {
      headers["content-type"] = "application/json"
      chunks.push(JSON.stringify(value))
      ended = true
      return res
    },
    send(text) {
      chunks.push(String(text))
      ended = true
      return res
    },
    write(chunk) {
      chunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"))
      return true
    },
    end(chunk) {
      if (chunk) res.write(chunk)
      ended = true
      return res
    },
  }

  const reply = () => ({ statusCode: status, headers, body: chunks.join("") })

  if (path !== "/api/chat") {
    return { statusCode: 404, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: "not here" }) }
  }

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
    await chat(req, res)
  } catch (error) {
    if (!chunks.length) return { statusCode: 500, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }
  }
  void ended
  return reply()
}
