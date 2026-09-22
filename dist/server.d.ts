import { McpServer } from '@modelcontextprotocol/server';
import { FheSession } from './fhe.js';
declare const VERSION = "0.5.0-preview.1";
export declare function createFheServer(session?: FheSession): McpServer;
export { VERSION };
