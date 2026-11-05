// Local stand-in for Vercel Functions: serves api/*.js on :3001 so the Vite
// proxy (/api -> :3001) works in dev. Run: node --env-file=.env scripts/dev-api.mjs
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'

const PORT = 3001
const API_DIR = path.resolve('api')
const NAME_RE = /^[a-z0-9-]+$/

function decorate(res) {
  res.status = code => { res.statusCode = code; return res }
  res.json = obj => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(obj))
    return res
  }
  res.send = body => { res.end(typeof body === 'string' ? body : JSON.stringify(body)); return res }
  return res
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString()
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return raw }
}

http.createServer(async (req, res) => {
  decorate(res)
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const name = url.pathname.replace(/^\/api\//, '')
  const file = path.join(API_DIR, `${name}.js`)
  if (!NAME_RE.test(name) || name.startsWith('_') || !existsSync(file)) return res.status(404).json({ error: 'Not found' })
  try {
    req.query = Object.fromEntries(url.searchParams)
    req.body = await readBody(req)
    const mod = await import(pathToFileURL(file).href)
    await mod.default(req, res)
  } catch (err) {
    console.error(`[dev-api] ${name}:`, err)
    if (!res.headersSent) res.status(500).json({ error: 'Dev API error' })
  }
}).listen(PORT, '127.0.0.1', () => console.log(`dev-api on 127.0.0.1:${PORT}`))
