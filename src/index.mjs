import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { createServer } from "node:http";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import proxy from '@fastify/http-proxy';

import { uwsServer } from 'uwisp-server';

const app = Fastify({
  serverFactory: (handler) => {
    const server = createServer((req, res) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      handler(req, res);
    });
    return server;
  }
});

app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  serve: true,
  wildcard: false
});

app.register(fastifyStatic, {
  root: epoxyPath,
  prefix: '/epoxy',
  serve: true,
  wildcard: true,
  decorateReply: false
});

app.register(fastifyStatic, {
  root: baremuxPath,
  prefix: '/baremux',
  serve: true,
  wildcard: true,
  decorateReply: false,
})

app.register(fastifyStatic, {
  root: uvPath,
  prefix: '/uv',
  serve: true,
  wildcard: true,
  decorateReply: false
})


app.setNotFoundHandler((request, reply) => {
  reply.code(404).sendFile('404.html', { root: publicPath });
});

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;

let wsPort = parseInt(process.env.PORT || "");
if (isNaN(wsPort)) wsPort = 9090;


app.register(proxy, {
  upstream: 'http://localhost:' + wsPort,
  prefix: '/wisp',
  websocket: true,
});


const start = async () => {
  try {
    await app.listen({ port });
    const address = app.server.address();
    console.log("Frontend Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
    console.log(
      `\thttp://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  app.close().then(() => {
    uwsServer.close();
    process.exit(0);
  });
}

uwsServer.listen(wsPort, (listenSocket) => {
  if (listenSocket) {
    console.log(`[Wisp]: Server is listening on port ${wsPort}`);
  }
});

start();
