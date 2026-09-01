import { McpServer } from '@modelcontextprotocol/server';
import { FheSession } from './fhe.js';
declare const VERSION = "0.4.0";
export declare function createFheServer(session?: FheSession): McpServer;
export { VERSION };
