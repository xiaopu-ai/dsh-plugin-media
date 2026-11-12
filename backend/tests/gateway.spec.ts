/** The workbench model gateway: Messages requests run on the Host's model calls, and Host chunks come back as Messages events. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ImageBlock, StreamChunk } from '@deepseek-ai/dsh-llm'
import { StudioGateway, type GatewayLlm, type GatewayWeb } from '../src/gateway.ts'
import { htmlText } from '../src/html-text.ts'
import { bridgeRequest, BridgeRequestError, MessagesStreamWriter, splitRoute, type BridgeEvent } from '../src/messages-bridge.ts'

const gateways: StudioGateway[] = []
afterEach(() => { for (const gateway of gateways.splice(0)) gateway.stop() })

const image: ImageBlock = { type: 'image', attachment: { id: 'img-1' } as never }
const saveImage = vi.fn(() => Promise.resolve<ImageBlock | undefined>(image))

describe('request translation', () => {
  it('splits routes at the first slash', () => {
    expect(splitRoute('anthropic/claude-opus-5-5')).toEqual({ provider: 'anthropic', model: 'claude-opus-5-5' })
    expect(splitRoute('openrouter/meta/llama')).toEqual({ provider: 'openrouter', model: 'meta/llama' })
    expect([splitRoute('nomodel'), splitRoute('/m'), splitRoute('p/')]).toEqual([undefined, undefined, undefined])
  })

  it('turns turns, tool results, images and tools into Host messages', async () => {
    const bridged = await bridgeRequest({
      model: 'anthropic/claude-opus-5-5', max_tokens: 100, stream: true,
      system: [{ type: 'text', text: '系统一' }, { type: 'text', text: '系统二' }, 'skip'],
      messages: [
        { role: 'user', content: '写一段' },
        { role: 'assistant', content: [
          { type: 'thinking', thinking: '想', signature: 's' }, { type: 'text', text: '好的' }, { type: 'text', text: '' },
          { type: 'tool_use', id: 'call-1', name: 'read_file', input: { path: 'a.md' } }, { type: 'tool_use', id: 'call-2', name: 'list_files' },
          { type: 'server_tool_use', id: 's', name: 'web_search' },
        ] },
        { role: 'user', content: [
          { type: 'tool_result', tool_use_id: 'call-1', content: '内容' },
          { type: 'tool_result', tool_use_id: 'call-2', is_error: true, content: [{ type: 'text', text: '失败' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }] },
          { type: 'text', text: '继续' }, { type: 'image', source: { type: 'url', url: 'https://x' } }, 'not a block',
        ] },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call-3', content: 'only' }] },
      ],
      tools: [
        { name: 'edit_file', description: '改文件', input_schema: { type: 'object', properties: {} }, eager_input_streaming: true },
        { name: 'bare' }, { type: 'web_search_20260209', name: 'web_search' }, { type: 'custom', name: 'c', description: 'd' }, 'x',
      ],
    }, saveImage, undefined)
    expect(bridged).toMatchObject({ route: 'anthropic/claude-opus-5-5', provider: 'anthropic', model: 'claude-opus-5-5', system: '系统一\n\n系统二', maxTokens: 100, stream: true })
    expect(bridged.tools).toEqual([
      { name: 'edit_file', description: '改文件', parameters: { type: 'object', properties: {} } },
      { name: 'bare', description: '', parameters: { type: 'object' } },
      { name: 'c', description: 'd', parameters: { type: 'object' } },
    ])
    expect(bridged.messages.map(message => [message.role, message.content])).toEqual([
      ['user', [{ type: 'text', text: '写一段' }]],
      ['assistant', [
        { type: 'text', text: '好的' }, { type: 'tool-call', id: 'call-1', name: 'read_file', arguments: '{"path":"a.md"}' },
        { type: 'tool-call', id: 'call-2', name: 'list_files', arguments: '{}' },
      ]],
      ['tool', [{ type: 'text', text: '内容' }]],
      ['tool', [{ type: 'text', text: '失败' }, image]],
      ['user', [{ type: 'text', text: '继续' }]],
      ['tool', [{ type: 'text', text: 'only' }]],
    ])
    expect(bridged.messages[1]).toMatchObject({ source: { kind: 'model', provider: 'anthropic', model: 'claude-opus-5-5' } })
    expect(bridged.messages[3]).toMatchObject({ isError: true, toolCallId: 'call-2' })
    expect(saveImage).toHaveBeenCalledWith(Buffer.from('AAAA', 'base64'), 'image/png')
  })

  it('uses the default model, notes images the Host cannot take, and refuses malformed requests', async () => {
    const noImages = vi.fn(() => Promise.resolve(undefined))
    const bridged = await bridgeRequest({ model: 'dsh', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA' } }] }] }, noImages, 'deepseek-official/deepseek-v4-pro')
    expect(bridged).toMatchObject({ provider: 'deepseek-official', model: 'deepseek-v4-pro', system: '', maxTokens: undefined, stream: false, tools: [] })
    expect(bridged.messages[0]?.content).toEqual([{ type: 'text', text: '［这里有一张图片，当前环境无法把它交给模型］' }])
    expect((await bridgeRequest({ system: '系统', messages: [] }, noImages, 'p/m')).system).toBe('系统')
    await expect(bridgeRequest({ messages: [] }, noImages, undefined)).rejects.toThrow('客户端还没有选默认模型')
    await expect(bridgeRequest({ model: 'claude', messages: [] }, noImages, undefined)).rejects.toThrow('服务商/模型')
    await expect(bridgeRequest({ model: 'p/m' }, noImages, undefined)).rejects.toThrow(BridgeRequestError)
    await expect(bridgeRequest({ model: 'p/m', messages: [{ role: 'system', content: 'x' }] }, noImages, undefined)).rejects.toThrow('不认识的角色')
    await expect(bridgeRequest({ model: 'p/m', messages: [{ role: 'user', content: [{ type: 'tool_result' }] }] }, noImages, undefined)).rejects.toThrow('tool_use_id')
  })
})

describe('stream translation', () => {
  it('turns text, reasoning and tool calls into Messages events and an assembled message', () => {
    const events: BridgeEvent[] = []
    const writer = new MessagesStreamWriter('msg_1', 'p/m', (event) => { events.push(event) })
    writer.start()
    const chunks: StreamChunk[] = [
      { type: 'block-start', index: 0, blockType: 'reasoning' },
      { type: 'reasoning-delta', index: 0, text: '想' },
      { type: 'block-end', index: 0, block: { type: 'reasoning', text: '想' } },
      { type: 'block-start', index: 1, blockType: 'text' },
      { type: 'text-delta', index: 1, text: '你好' },
      { type: 'block-end', index: 1, block: { type: 'text', text: '你好' } },
      { type: 'block-start', index: 2, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: 2, id: 'c1' as never, name: 'edit_file', argumentsDelta: '{"pa' },
      { type: 'tool-call-delta', index: 2, id: 'c1' as never, argumentsDelta: 'th":"a"}' },
      { type: 'tool-call-delta', index: 2, id: 'c1' as never, argumentsDelta: '' },
      { type: 'block-end', index: 2, block: { type: 'tool-call', id: 'c1' as never, name: 'edit_file', arguments: '{"path":"a"}' } },
      { type: 'block-start', index: 3, blockType: 'tool-call' },
      { type: 'block-end', index: 3, block: { type: 'tool-call', id: 'c2' as never, name: 'list_files', arguments: '' } },
      { type: 'block-start', index: 4, blockType: 'tool-call' },
      { type: 'block-end', index: 4, block: { type: 'tool-call', id: 'c3' as never, name: 'build', arguments: '{"x":' } },
      { type: 'block-start', index: 5, blockType: 'image' },
      { type: 'text-delta', index: 9, text: 'stray' },
      { type: 'reasoning-delta', index: 9, text: 'stray' },
      { type: 'tool-call-delta', index: 9, id: 'x' as never, argumentsDelta: 'stray' },
      { type: 'block-end', index: 9, block: { type: 'text', text: '' } },
      { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } },
      { type: 'finish', reason: { kind: 'tool-calls' } },
    ]
    for (const chunk of chunks) writer.push(chunk)
    expect(events.map(event => event.type)).toEqual([
      'message_start',
      'content_block_start', 'content_block_delta', 'content_block_stop',
      'content_block_start', 'content_block_delta', 'content_block_stop',
      'content_block_start', 'content_block_delta', 'content_block_delta', 'content_block_stop',
      'content_block_start', 'content_block_stop',
      'content_block_start', 'content_block_delta', 'content_block_stop',
      'message_delta', 'message_stop',
    ])
    expect(events[7]).toEqual({ type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'c1', name: 'edit_file', input: {} } })
    expect(events[16]).toEqual({ type: 'message_delta', delta: { stop_reason: 'tool_use', stop_sequence: null }, usage: { output_tokens: 5 } })
    expect(writer.final()).toEqual({
      id: 'msg_1', type: 'message', role: 'assistant', model: 'p/m', stop_sequence: null, stop_reason: 'tool_use',
      usage: { input_tokens: 10, output_tokens: 5 },
      content: [
        { type: 'thinking', thinking: '想', signature: '' }, { type: 'text', text: '你好' },
        { type: 'tool_use', id: 'c1', name: 'edit_file', input: { path: 'a' } }, { type: 'tool_use', id: 'c2', name: 'list_files', input: {} },
        { type: 'tool_use', id: 'c3', name: 'build', input: '{"x":' },
      ],
    })
  })

  it('maps finish reasons and raises provider failures', () => {
    const reasons = (['stop', 'max-tokens'] as const).map((kind) => {
      const writer = new MessagesStreamWriter('m', 'p/m', () => {})
      writer.push({ type: 'finish', reason: { kind } })
      return writer.final().stop_reason
    })
    expect(reasons).toEqual(['end_turn', 'max_tokens'])
    const unknown = new MessagesStreamWriter('m', 'p/m', () => {})
    unknown.push({ type: 'finish', reason: { kind: 'other' } as never })
    unknown.push({ type: 'unknown' } as never)
    expect(unknown.final().stop_reason).toBe('end_turn')
    const failing = new MessagesStreamWriter('m', 'p/m', () => {})
    expect(() => { failing.push({ type: 'finish', reason: { kind: 'error', failure: { message: '额度用完了' } as never } }) }).toThrow('额度用完了')
    expect(() => { failing.push({ type: 'finish', reason: { kind: 'aborted', failure: { message: '停了' } as never } }) }).toThrow('停了')
  })

  it('reduces HTML to readable text', () => {
    expect(htmlText('<html><head><style>p{}</style><script>x()</script></head><body><h1>标题</h1><p>一 &amp; 二&nbsp;三 &#20013;&#x6587; &unknown;</p><!-- c --><div>尾</div></body></html>'))
      .toBe('标题\n一 & 二 三 中文 &unknown;\n尾')
  })
})

function fakeLlm(chunks: StreamChunk[] | Error = [
  { type: 'block-start', index: 0, blockType: 'text' },
  { type: 'text-delta', index: 0, text: '好' },
  { type: 'block-end', index: 0, block: { type: 'text', text: '好' } },
  { type: 'finish', reason: { kind: 'stop' } },
], defaultRoute: string | null = 'anthropic/claude-opus-5-5'): GatewayLlm & { stream: ReturnType<typeof vi.fn> } {
  return {
    models: () => Promise.resolve([{ id: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5 · Anthropic' }]),
    defaultRoute: () => defaultRoute ?? undefined,
    stream: vi.fn(async function* () {
      if (chunks instanceof Error) throw chunks
      for (const chunk of chunks) yield await Promise.resolve(chunk)
    }),
    saveImage,
  }
}

async function gateway(llm: GatewayLlm = fakeLlm(), web?: GatewayWeb): Promise<{ gateway: StudioGateway; url: string }> {
  const created = new StudioGateway({ llm, web: () => web, fetchChars: 5 })
  gateways.push(created)
  return { gateway: created, url: await created.start() }
}

function post(url: string, key: string | undefined, body: unknown): Promise<Response> {
  return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...key === undefined ? {} : { 'x-api-key': key } }, body: typeof body === 'string' ? body : JSON.stringify(body) })
}

describe('gateway server', () => {
  it('lists the client models and streams a call as Messages events', async () => {
    const llm = fakeLlm()
    const { gateway: created, url } = await gateway(llm)
    expect(await created.start()).toBe(url)
    const models = await fetch(`${url}/models`, { headers: { authorization: `Bearer ${created.key}` } })
    expect(await models.json()).toEqual({ default: 'anthropic/claude-opus-5-5', models: [{ id: 'anthropic/claude-opus-5-5', name: 'Claude Opus 5.5 · Anthropic' }] })
    const streamed = await post(`${url}/v1/messages`, created.key, { model: 'dsh', stream: true, max_tokens: 50, messages: [{ role: 'user', content: '你好' }] })
    expect(streamed.headers.get('content-type')).toContain('text/event-stream')
    const text = await streamed.text()
    expect(text.split('\n\n').filter(Boolean).map(frame => frame.split('\n')[0])).toEqual([
      'event: message_start', 'event: content_block_start', 'event: content_block_delta', 'event: content_block_stop', 'event: message_delta', 'event: message_stop',
    ])
    expect(llm.stream).toHaveBeenCalledWith(expect.objectContaining({ provider: 'anthropic', model: 'claude-opus-5-5', maxTokens: 50, tools: [] }))
    const whole = await post(`${url}/v1/messages`, created.key, { model: 'deepseek-official/deepseek-v4-pro', messages: [] })
    expect(await whole.json()).toMatchObject({ model: 'deepseek-official/deepseek-v4-pro', stop_reason: 'end_turn', content: [{ type: 'text', text: '好' }] })
  })

  it('reports failures as Messages errors', async () => {
    const failing = await gateway(fakeLlm([{ type: 'finish', reason: { kind: 'error', failure: { message: '额度用完了' } as never } }]))
    const streamed = await post(`${failing.url}/v1/messages`, failing.gateway.key, { stream: true, messages: [] })
    expect(await streamed.text()).toContain('event: error\ndata: {"type":"error","error":{"type":"api_error","message":"额度用完了"}}')
    const whole = await post(`${failing.url}/v1/messages`, failing.gateway.key, { messages: [] })
    expect(whole.status).toBe(500)
    expect(await whole.json()).toEqual({ type: 'error', error: { type: 'api_error', message: '额度用完了' } })
    const thrown = await gateway(fakeLlm(new Error('没有这个模型')))
    expect(await (await post(`${thrown.url}/v1/messages`, thrown.gateway.key, { stream: true, messages: [] })).text()).toContain('没有这个模型')
    const noDefault = await gateway(fakeLlm(undefined, null))
    const refused = await post(`${noDefault.url}/v1/messages`, noDefault.gateway.key, { messages: [] })
    expect(refused.status).toBe(400)
    expect(((await refused.json()) as { error: { message: string } }).error.message).toBe('客户端还没有选默认模型')
    expect((await post(`${noDefault.url}/v1/messages`, noDefault.gateway.key, '{bad')).status).toBe(400)
    expect((await post(`${noDefault.url}/v1/messages`, noDefault.gateway.key, '[1]')).status).toBe(400)
  })

  it('refuses other callers and unknown routes', async () => {
    const { gateway: created, url } = await gateway()
    expect((await post(`${url}/v1/messages`, 'wrong', {})).status).toBe(401)
    expect((await post(`${url}/v1/messages`, undefined, {})).status).toBe(401)
    expect((await fetch(`${url}/v1/messages`, { headers: { 'x-api-key': created.key } })).status).toBe(404)
    expect((await post(`${url}/other`, created.key, {})).status).toBe(404)
  })

  it('searches and fetches through the Host web service', async () => {
    const web: GatewayWeb = {
      search: vi.fn(() => Promise.resolve([{ url: 'https://a.example', title: 'A' }])),
      fetch: vi.fn(() => Promise.resolve({ url: 'https://a.example', status: 200, text: '0123456789' })),
    }
    const { gateway: created, url } = await gateway(fakeLlm(), web)
    expect(await (await post(`${url}/web/search`, created.key, { query: ' AI ', max_results: 50 })).json()).toEqual({ results: [{ url: 'https://a.example', title: 'A' }] })
    expect(web.search).toHaveBeenCalledWith('AI', 20, expect.any(AbortSignal))
    await post(`${url}/web/search`, created.key, { query: 'x' })
    expect(web.search).toHaveBeenLastCalledWith('x', 8, expect.any(AbortSignal))
    expect((await post(`${url}/web/search`, created.key, { query: ' ' })).status).toBe(400)
    expect(await (await post(`${url}/web/fetch`, created.key, { url: 'https://a.example' })).json()).toEqual({ url: 'https://a.example', status: 200, text: '01234', truncated: true })
    expect((await post(`${url}/web/fetch`, created.key, { url: 'file:///etc/passwd' })).status).toBe(400)
    const offline = await gateway()
    expect((await post(`${offline.url}/web/search`, offline.gateway.key, { query: 'x' })).status).toBe(503)
    expect((await post(`${offline.url}/web/fetch`, offline.gateway.key, { url: 'https://a.example' })).status).toBe(503)
    offline.gateway.stop()
    await expect(fetch(`${offline.url}/models`)).rejects.toThrow()
  })
})
