// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';

import * as parser from '@gmb/bitmark-parser';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createBitmarkEngine } from '../createBitmarkEngine';
import { BitmarkEngine, BitmarkEngineError, Feature, RawParserModule } from '../types';
import { createBitmarkWorkerEngine } from './createBitmarkWorkerEngine';
import { EnginePort } from './protocol';
import { serveBitmarkEngine } from './serveBitmarkEngine';

const book = fs.readFileSync(
  path.resolve(__dirname, '../../../test/fixtures/bitmark/book.bitmark'),
  'utf8',
);

/** A "worker" in-process: a MessageChannel whose far side serves `load`. */
const inProcessWorker = (
  load: (url: string, feature: Feature | undefined) => Promise<BitmarkEngine>,
  seen?: string[],
): (() => EnginePort) => {
  return () => {
    const { port1, port2 } = new MessageChannel();
    serveBitmarkEngine(port2 as unknown as EnginePort, load);
    port2.start();
    port1.start();
    const near = port1 as unknown as EnginePort;
    if (seen) {
      const post = near.postMessage.bind(near);
      const lane = `lane${seen.filter((s) => s.startsWith('open')).length}`;
      seen.push(`open:${lane}`);
      near.postMessage = (m: unknown) => {
        const msg = m as { type: string; method?: string };
        if (msg.type === 'call') seen.push(`${lane}:${msg.method}`);
        post(m);
      };
    }
    return near;
  };
};

describe('worker engine (PLAN-022 D14)', () => {
  let main: BitmarkEngine;
  beforeAll(async () => {
    await parser.init({ feature: 'full' });
    main = createBitmarkEngine(parser as unknown as RawParserModule, { feature: 'full' });
  });
  const loadReal = async () => main;

  it('gives the same results as the main-thread engine on the book fixture', async () => {
    const worker = await createBitmarkWorkerEngine({
      createPort: inProcessWorker(loadReal),
      url: 'x',
    });
    expect(worker.version).toBe(main.version);
    expect(await worker.bitmarkToJsonText(book)).toEqual(await main.bitmarkToJsonText(book));
    expect(await worker.semanticTokens(book)).toEqual(await main.semanticTokens(book));
    expect(await worker.diagnostics(book)).toEqual(await main.diagnostics(book));
    expect(await worker.splitBits(book)).toEqual(await main.splitBits(book));
    const json = (await main.bitmarkToJsonText(book)).text;
    const back = { inputFormat: 'json', outputFormat: 'bitmark' } as const;
    expect(await worker.convert(json, back)).toBe(await main.convert(json, back));
    const toText = { inputFormat: 'bitmark', outputFormat: 'text' } as const;
    // The real parser gives numeric bit starts (7.8 renamed `start` to `outputStart`).
    const { bitStarts } = await main.convertWithBitStarts(book, toText);
    expect(bitStarts?.length).toBeGreaterThan(1);
    expect(bitStarts!.every((n) => typeof n === 'number')).toBe(true);
    expect(await worker.convertWithBitStarts(book, toText)).toEqual(
      await main.convertWithBitStarts(book, toText),
    );
    worker.dispose();
  });

  it('routes editor services to the fast lane and conversions to the other', async () => {
    const seen: string[] = [];
    const worker = await createBitmarkWorkerEngine({
      createPort: inProcessWorker(loadReal, seen),
      url: 'x',
    });
    await worker.semanticTokens('[.article]');
    await worker.diagnostics('[.article]');
    await worker.hover('[.article]', { line: 0, character: 3 });
    await worker.bitmarkToJsonText('[.article]');
    await worker.convert('[.article]', { outputFormat: 'json' });
    expect(seen.filter((s) => !s.startsWith('open'))).toEqual([
      'lane0:semanticTokens',
      'lane0:diagnostics',
      'lane0:hover',
      'lane1:bitmarkToJsonText',
      'lane1:convert',
    ]);
    worker.dispose();
  });

  it('rejects with BitmarkEngineError and the parser message', async () => {
    const worker = await createBitmarkWorkerEngine({
      createPort: inProcessWorker(loadReal),
      url: 'x',
    });
    await expect(
      worker.convert('{not json', { inputFormat: 'json', outputFormat: 'bitmark' }),
    ).rejects.toBeInstanceOf(BitmarkEngineError);
    worker.dispose();
  });

  it('switches feature once both lanes report stage 2', async () => {
    const engines: BitmarkEngine[] = [];
    const load = async () => {
      const e = createBitmarkEngine(parser as unknown as RawParserModule, {
        feature: 'bitmark-json',
      });
      engines.push(e);
      return e;
    };
    const worker = await createBitmarkWorkerEngine({ createPort: inProcessWorker(load), url: 'x' });
    const changed = vi.fn();
    worker.onFeatureChange(changed);
    engines[0]!.setFeature('full');
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.feature).toBe('bitmark-json');
    engines[1]!.setFeature('full');
    await new Promise((r) => setTimeout(r, 10));
    expect(worker.feature).toBe('full');
    expect(changed).toHaveBeenCalledWith('full');
    worker.dispose();
  });

  it('rejects when a worker cannot load the parser, and closes both ports', async () => {
    const closed: string[] = [];
    const base = inProcessWorker(async () => {
      throw new Error('no parser here');
    });
    const createPort = () => {
      const p = base();
      p.close = () => closed.push('closed');
      return p;
    };
    await expect(createBitmarkWorkerEngine({ createPort, url: 'x' })).rejects.toThrow(
      'no parser here',
    );
    expect(closed).toHaveLength(2);
  });
});

describe('worker failures (PLAN-023 pass 1)', () => {
  /** A port whose worker never answers, and can fail. */
  const silentPort = () => {
    const listeners = new Map<string, ((e: MessageEvent) => void)[]>();
    const port: EnginePort & {
      fail(type: string): void;
      fireMessage(data: unknown): void;
      posted: unknown[];
    } = {
      posted: [],
      fireMessage: (data) =>
        (listeners.get('message') ?? []).forEach((l) => l({ data } as MessageEvent)),
      postMessage: (m: unknown) => port.posted.push(m),
      addEventListener: (type, l) => listeners.set(type, [...(listeners.get(type) ?? []), l]),
      removeEventListener: () => {},
      terminate: () => {},
      fail: (type) =>
        (listeners.get(type) ?? []).forEach((l) => l(new Event(type) as MessageEvent)),
    };
    return port;
  };

  it('rejects when a worker errors before it is ready', async () => {
    const ports = [silentPort(), silentPort()];
    let i = 0;
    const pending = createBitmarkWorkerEngine({ createPort: () => ports[i++]!, url: 'x' });
    ports[0]!.fail('error');
    await expect(pending).rejects.toBeInstanceOf(BitmarkEngineError);
  });

  /** A port that answers init (ready) but never answers a call. */
  const readyPort = () => {
    const port = silentPort();
    const post = port.postMessage;
    port.postMessage = (m: unknown) => {
      post(m);
      if ((m as { type: string }).type === 'init') {
        queueMicrotask(() =>
          port.fireMessage({
            type: 'ready',
            version: '1',
            feature: 'full',
            capabilities: {
              bitPositions: true,
              diagnostics: true,
              complete: true,
              resolve: true,
              hover: true,
              info: true,
            },
          }),
        );
      }
    };
    return port;
  };

  it('rejects the calls in flight on a worker error after ready, and keeps the lane', async () => {
    const ports = [readyPort(), readyPort()];
    let i = 0;
    const worker = await createBitmarkWorkerEngine({ createPort: () => ports[i++]!, url: 'x' });
    const stuck = worker.convert('[.article]', { outputFormat: 'json' });
    ports[1]!.fail('messageerror');
    await expect(stuck).rejects.toBeInstanceOf(BitmarkEngineError);
    // One bad message must not kill the lane: the next call still reaches the worker.
    const sent = ports[1]!.posted.length;
    void worker.convert('x', { outputFormat: 'json' }).catch(() => undefined);
    expect(ports[1]!.posted.length).toBe(sent + 1);
    worker.dispose();
  });

  it('rejects pending calls on dispose', async () => {
    const ports = [readyPort(), readyPort()];
    let i = 0;
    const worker = await createBitmarkWorkerEngine({ createPort: () => ports[i++]!, url: 'x' });
    const stuck = worker.semanticTokens('[.article]');
    worker.dispose();
    await expect(stuck).rejects.toThrow('disposed');
  });
});
