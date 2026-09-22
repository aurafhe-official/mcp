import { McpServer } from '@modelcontextprotocol/server';
import { SealedSession, type ResultBundle } from './sealed.js';
export declare function createSealedServer(session?: SealedSession, save?: (result: ResultBundle) => Promise<void>): McpServer;
export declare function configuredSealedServer(): Promise<McpServer>;
