import { useEffect, useRef, useState } from 'react'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ArrowRight, Check, CircleHelp, Link2, LoaderCircle, Plug, Unplug } from 'lucide-react'
import type { CapsuleSection, Recipient } from '../domain/capsule'

type Connection = { client: Client; transport: StreamableHTTPClientTransport }
type McpDemoProps = {
  conversation: string
  excludePrivate: boolean
  recipient: Recipient
  sections: CapsuleSection[]
  onExtracted: (sections: CapsuleSection[]) => void
}

type McpPreview = {
  version: number
  sharedAt: string
  recipient: Recipient
  sections: CapsuleSection[]
  revoked: boolean
  persistence: 'preview-only'
}

function textContent(result: unknown) {
  if (typeof result !== 'object' || result === null || !('content' in result) || !Array.isArray(result.content)) {
    throw new Error('The MCP server returned no tool content.')
  }
  const text = result.content
    .filter((item): item is { type: 'text'; text: string } =>
      typeof item === 'object' && item !== null
      && 'type' in item && item.type === 'text'
      && 'text' in item && typeof item.text === 'string')
    .map(item => item.text)
    .join('\n')
  if (!text) throw new Error('The MCP server returned no text content.')
  return text
}

function parseToolResult<T>(result: unknown): T {
  const text = textContent(result)
  if (typeof result === 'object' && result !== null && 'isError' in result && result.isError) {
    throw new Error(text)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('The MCP server returned malformed JSON.')
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected MCP error occurred.'
}

function isCapsuleSections(value: unknown): value is CapsuleSection[] {
  return Array.isArray(value) && value.every(section =>
    typeof section === 'object' && section !== null
    && 'title' in section && ['Decisions', 'Constraints', 'Open questions', 'Next actions'].includes(String(section.title))
    && 'icon' in section && typeof section.icon === 'string'
    && 'items' in section && Array.isArray(section.items)
    && section.items.every((item: unknown) =>
      typeof item === 'object' && item !== null
      && 'id' in item && typeof item.id === 'string'
      && 'text' in item && typeof item.text === 'string'
      && (!('checked' in item) || typeof item.checked === 'boolean')))
}

export default function McpDemo({ conversation, excludePrivate, recipient, sections, onExtracted }: McpDemoProps) {
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:8787/mcp')
  const [connection, setConnection] = useState<Connection | null>(null)
  const [toolNames, setToolNames] = useState<string[]>([])
  const [provider, setProvider] = useState('unknown')
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<McpPreview | null>(null)
  const connectionRef = useRef<Connection | null>(null)

  useEffect(() => () => {
    void connectionRef.current?.client.close()
    connectionRef.current = null
  }, [])

  const connect = async () => {
    setBusy(true)
    setError('')
    setPreview(null)
    let nextClient: Client | undefined
    try {
      const [{ Client: McpClient }, { StreamableHTTPClientTransport: HttpTransport }] = await Promise.all([
        import('@modelcontextprotocol/sdk/client/index.js'),
        import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
      ])
      const parsedEndpoint = new URL(endpoint)
      const nextTransport = new HttpTransport(parsedEndpoint)
      nextClient = new McpClient({ name: 'relay-web-demo', version: '1.0.0' })
      await nextClient.connect(nextTransport)
      const result = await nextClient.listTools()
      const names = result.tools.map(tool => tool.name)
      if (!names.includes('relay_extract_context') || !names.includes('relay_create_handoff')) {
        throw new Error('This server is reachable, but it does not provide the Relay handoff tools.')
      }
      const origin = parsedEndpoint.origin
      const health = await fetch(`${origin}/health`)
      if (!health.ok) throw new Error(`MCP health check failed (${health.status}).`)
      const status = await health.json() as { extractionProvider?: string }
      const nextConnection = { client: nextClient, transport: nextTransport }
      connectionRef.current = nextConnection
      setConnection(nextConnection)
      setToolNames(names)
      setProvider(status.extractionProvider ?? 'unknown')
      setConsent(false)
    } catch (caught) {
      await nextClient?.close().catch(() => undefined)
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    const active = connectionRef.current
    connectionRef.current = null
    setConnection(null)
    setToolNames([])
    setPreview(null)
    if (active) {
      try {
        await active.client.close()
      } catch (caught) {
        setError(errorMessage(caught))
      }
    }
  }

  const extract = async () => {
    if (!connection) return
    setBusy(true)
    setError('')
    setPreview(null)
    try {
      const result = await connection.client.callTool({
        name: 'relay_extract_context',
        arguments: {
          conversation,
          excludePrivate,
          allowBedrockDataTransfer: consent,
        },
      })
      const extracted = parseToolResult<{ sections: CapsuleSection[] }>(result)
      if (!isCapsuleSections(extracted.sections)) throw new Error('MCP extraction returned invalid handoff sections.')
      onExtracted(extracted.sections)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const createPreview = async () => {
    if (!connection) return
    setBusy(true)
    setError('')
    try {
      const result = await connection.client.callTool({
        name: 'relay_create_handoff',
        arguments: { recipient, sections },
      })
      const nextPreview = parseToolResult<McpPreview>(result)
      if (nextPreview.persistence !== 'preview-only'
        || !isCapsuleSections(nextPreview.sections)
        || !['Leo · planning team', 'Maya · event co-lead'].includes(nextPreview.recipient)) {
        throw new Error('The MCP server returned an unrecognized handoff format.')
      }
      setPreview(nextPreview)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return <section className="mcp-demo panel" aria-labelledby="mcp-demo-title">
    <div className="mcp-demo-header">
      <div className="panel-title">
        <span className="step-icon violet"><Plug size={17}/></span>
        <div>
          <div className="mcp-eyebrow">LIVE PROTOCOL DEMO · STREAMABLE HTTP</div>
          <h2 id="mcp-demo-title">Try the Relay MCP server</h2>
          <p>Connect to your local server and run its tools from this page.</p>
        </div>
      </div>
      <span className={'mcp-status ' + (connection ? 'connected' : 'disconnected')}>
        <i/> {connection ? `${provider} · connected` : 'not connected'}
      </span>
    </div>
    <div className="mcp-controls">
      <label className="mcp-endpoint">MCP endpoint
        <input value={endpoint} onChange={event => setEndpoint(event.target.value)} disabled={Boolean(connection || busy)} spellCheck={false}/>
      </label>
      {connection
        ? <button className="mcp-connect-button secondary" onClick={disconnect} disabled={busy}><Unplug size={14}/> Disconnect</button>
        : <button className="mcp-connect-button" onClick={connect} disabled={busy || !endpoint.trim()}>{busy ? <LoaderCircle className="mcp-spinner" size={14}/> : <Link2 size={14}/>} Connect</button>}
    </div>
    {connection && <div className="mcp-actions">
      <div className="mcp-tool-row"><span className="mcp-tool-name">relay_extract_context</span><span>Run extraction through the MCP tool</span><button onClick={extract} disabled={busy || !conversation.trim()}>{busy ? <LoaderCircle className="mcp-spinner" size={14}/> : <ArrowRight size={14}/>} Extract via MCP</button></div>
      {provider === 'bedrock' && <label className="mcp-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)}/><span>I agree to send non-excluded conversation text to Amazon Bedrock for extraction.</span></label>}
      {provider !== 'bedrock' && <p className="mcp-local-note"><Check size={13}/> Extraction provider: {provider}. No AWS transfer is enabled by this server.</p>}
      <div className="mcp-tool-row"><span className="mcp-tool-name">relay_create_handoff</span><span>Preview the capsule currently shown above</span><button onClick={createPreview} disabled={busy || sections.every(section => section.items.length === 0)}>{busy ? <LoaderCircle className="mcp-spinner" size={14}/> : <ArrowRight size={14}/>} Create MCP preview</button></div>
      <p className="mcp-preview-note"><CircleHelp size={13}/> Preview only: not shared with the recipient or durably stored.</p>
    </div>}
    {error && <p className="mcp-error" role="alert">{error}</p>}
    {preview && <div className="mcp-preview" aria-live="polite">
      <div className="mcp-preview-heading"><b>MCP handoff preview · v{preview.version}</b><span>{preview.recipient}</span></div>
      {preview.sections.map(section => section.items.length > 0 && <div className="mcp-preview-section" key={section.title}><b>{section.title}</b><ul>{section.items.map(item => <li key={item.id}>{item.text}</li>)}</ul></div>)}
      <small>Created {new Date(preview.sharedAt).toLocaleString()} · preview only</small>
    </div>}
    {!connection && <p className="mcp-start-note">Start the server with <code>npm run mcp</code>, then connect. The browser demo works with localhost MCP endpoints.</p>}
    <details className="mcp-tool-details">
      <summary>Tools discovered from server {toolNames.length > 0 && `· ${toolNames.join(', ')}`}</summary>
      <p>The page uses the official MCP TypeScript client over Streamable HTTP. Start with local extraction; the server itself reports whether Bedrock is enabled.</p>
    </details>
  </section>
}
