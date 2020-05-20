'use strict';

const config = require('wild-config');
const http = require('http');
const logger = require('./logger');

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World');
});

server.listen(config.api.port, config.api.host, () => {
    const addr = server.address();
    logger.info({ msg: 'API server running', address: addr.address, port: addr.port });
});