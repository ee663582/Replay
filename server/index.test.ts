import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Server } from 'node:http'
import { startRelayMcpServer } from './index.ts'

let httpServer: Server
let client: Client
let transport: StreamableHTTPClientTransport

function resultText(result: unknown) {
  if (typeof result !== 'object' || result === null || !('content' in result) || !Array.isArray(result.content)) {
    assert.fail('MCP tool result did not contain content.')
  }
  const item = result.content.find((entry: unknown): entry is { type: 'text'; text: string } =>
    typeof entry === 'object' && entry !== null
      && 'type' in entry && entry.type === 'text'
      && 'text' in entry && typeof entry.text === 'string')
  assert.ok(item)
  return item.text
}

before(async () => {
  httpServer = await startRelayMcpServer({ port: 0 })
  const address = httpServer.address()
  assert.ok(address && typeof address !== 'string')
  transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`))
  client = new Client({ name: 'relay-test-client', version: '1.0.0' })
  await client.connect(transport)
})

after(async () => {
  await client?.close()
  await new Promise<void>((resolve, reject) => {
    httpServer.close(error => error ? reject(error) : resolve())
  })
})

test('advertises Relay extraction and handoff MCP tools', async () => {
  const result = await client.listTools()
  assert.deepEqual(
    result.tools.map(tool => tool.name).sort(),
    ['relay_create_handoff', 'relay_extract_context'],
  )
})

test('allows browser requests from localhost and rejects remote origins', async () => {
  const address = httpServer.address()
  assert.ok(address && typeof address !== 'string')
  const endpoint = `http://127.0.0.1:${address.port}/mcp`
  const preflight = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,mcp-protocol-version',
    },
  })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assert.match(preflight.headers.get('access-control-allow-headers') ?? '', /mcp-protocol-version/i)

  const denied = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://outside.example',
      'Access-Control-Request-Method': 'POST',
    },
  })
  assert.equal(denied.status, 403)
})

test('extracts context locally and excludes marked private content by default', async () => {
  const result = await client.callTool({
    name: 'relay_extract_context',
    arguments: {
      conversation: "Maya: We'll focus on bike repairs.\nMaya: I'll bring a repair kit.\n\n[PRIVATE — exclude]\nPhone number 555-0198",
    },
  })
  assert.equal(result.isError, undefined)
  const text = resultText(result)
  const payload = JSON.parse(text)
  assert.equal(payload.provider, 'local')
  assert.ok(payload.sections.some((section: { items: Array<{ text: string }> }) =>
    section.items.some(item => item.text.includes('bike repairs'))))
  assert.ok(!text.includes('555-0198'))
})

test('creates a preview-only frozen handoff without claiming durable sharing', async () => {
  const result = await client.callTool({
    name: 'relay_create_handoff',
    arguments: {
      recipient: 'Maya · event co-lead',
      sections: [{ title: 'Decisions', icon: '✳', items: [{ id: 'a1', text: 'Keep the event free.' }] }],
    },
  })
  assert.equal(result.isError, undefined)
  const text = resultText(result)
  const payload = JSON.parse(text)
  assert.equal(payload.recipient, 'Maya · event co-lead')
  assert.equal(payload.persistence, 'preview-only')
  assert.equal(payload.sections[0].items[0].text, 'Keep the event free.')
})

test('requires explicit consent before Bedrock can receive source text', async () => {
  const previousProvider = process.env.RELAY_EXTRACTION_PROVIDER
  process.env.RELAY_EXTRACTION_PROVIDER = 'bedrock'
  try {
    const result = await client.callTool({
      name: 'relay_extract_context',
      arguments: { conversation: 'A private conversation.' },
    })
    assert.equal(result.isError, true)
    assert.match(resultText(result), /explicit consent/)
  } finally {
    if (previousProvider === undefined) delete process.env.RELAY_EXTRACTION_PROVIDER
    else process.env.RELAY_EXTRACTION_PROVIDER = previousProvider
  }
})
