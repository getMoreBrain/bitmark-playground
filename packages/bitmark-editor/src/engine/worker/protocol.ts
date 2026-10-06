// @awa-component: PLAN-021-WorkerEngine
import type { EngineCapabilities, Feature } from '../types';

/**
 * The messages between a worker engine and the engine it serves inside a
 * worker. Plain structured-clone data only.
 */

/** The one side of a channel the engine talks over (a `Worker`, or a `MessagePort`). */
export interface EnginePort {
  postMessage(message: unknown): void;
  /** `message`, plus `error` / `messageerror` (a worker that fails to load or dies). */
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
  /** A `Worker` has it; a `MessagePort` has `close`. Either ends the channel. */
  terminate?(): void;
  close?(): void;
}

/** The engine methods a worker serves (everything that takes a document). */
export const ENGINE_METHODS = [
  'bitmarkToObjects',
  'bitmarkToJsonText',
  'convert',
  'convertWithBitStarts',
  'semanticTokens',
  'splitBits',
  'diagnostics',
  'complete',
  'resolve',
  'hover',
  'info',
] as const;
export type EngineMethod = (typeof ENGINE_METHODS)[number];

/** Start the engine in the worker: load the parser at `url`, two stages. */
export interface InitRequest {
  type: 'init';
  url: string;
  feature?: Feature;
}

export interface CallRequest {
  type: 'call';
  id: number;
  method: EngineMethod;
  args: unknown[];
}

/** The worker's engine is up (stage 1). */
export interface ReadyMessage {
  type: 'ready';
  version: string;
  feature: Feature;
  capabilities: EngineCapabilities;
}

/** The worker's engine now runs `feature` (stage 2 landed). */
export interface FeatureMessage {
  type: 'feature';
  feature: Feature;
}

export interface ResultMessage {
  type: 'result';
  id: number;
  ok: boolean;
  value?: unknown;
  error?: { name: string; message: string };
}

/** The worker could not start (the parser failed to load). */
export interface FailedMessage {
  type: 'failed';
  error: { name: string; message: string };
}

export type ToWorker = InitRequest | CallRequest;
export type FromWorker = ReadyMessage | FeatureMessage | ResultMessage | FailedMessage;

export const serializeError = (e: unknown): { name: string; message: string } =>
  e instanceof Error ? { name: e.name, message: e.message } : { name: 'Error', message: String(e) };
