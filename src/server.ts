import { WebServer } from './infrastructure/adapters/inbound/web/express/web.server';

const webServer = new WebServer();
webServer.start();
