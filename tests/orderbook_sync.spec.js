const assert = require('assert');
const nock = require('nock');

const CoinbasePro = require('../index.js');

const testserver = require('./lib/ws_testserver');
let port = 56632;
const { EXCHANGE_API_URL } = require('../lib/utilities');

suite('OrderbookSync', () => {
  teardown(() => nock.cleanAll());

  test('not passes authentication details to websocket', done => {
    const server = testserver(port, () => {
      let orderBookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD'],
        api_uri: 'ws://localhost:' + port,
      });
      orderBookSync.connect();
    });

    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.strictEqual(msg.key, undefined);
        assert.strictEqual(msg.passphrase, undefined);

        server.close();
        done();
      });
    });
  });

  test('passes authentication details to websocket', done => {
    const server = testserver(port, () => {
      let orderBookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-EUR'],
        api_uri: 'ws://localhost:' + port,
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      });
      orderBookSync.connect();
    });

    server.on('connection', socket => {
      socket.on('message', data => {
        const msg = JSON.parse(data);
        assert.equal(msg.type, 'subscribe');
        assert.equal(msg.key, 'suchkey');
        assert.equal(msg.passphrase, 'muchpassphrase');

        server.close();
        done();
      });
    });
  });

  test('emits a message event', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD'],
        api_uri: 'ws://localhost:' + port,
      });
      orderbookSync.on('message', data => {
        assert.deepEqual(data, {
          test: true,
          product_id: 'BTC-USD',
        });
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ test: true, product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('emits a message event (with auth)', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD'],
        api_uri: 'ws://localhost:' + port,
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      });
      orderbookSync.on('message', data => {
        assert.deepEqual(data, {
          test: true,
          product_id: 'BTC-USD',
        });
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ test: true, product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('emits an error event on error', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .replyWithError('whoops');

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD'],
        api_uri: 'ws://localhost:' + port,
      });

      orderbookSync.on('error', err => {
        assert.equal(err.message, 'Failed to load orderbook: whoops');
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('emits an error event on error (with auth)', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .replyWithError('whoops');

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD'],
        api_uri: 'ws://localhost:' + port,
        key: 'suchkey',
        secret: 'suchsecret',
        passphrase: 'muchpassphrase',
      });

      orderbookSync.on('error', err => {
        assert.equal(err.message, 'Failed to load orderbook: whoops');
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('builds specified books', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD', 'ETH-USD'],
        api_uri: 'ws://localhost:' + port,
      });

      orderbookSync.on('message', data => {
        let state = orderbookSync.books[data.product_id].state();
        assert.deepEqual(state, { asks: [], bids: [] });
        assert.equal(orderbookSync.books['ETH-BTC'], undefined);
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.send(JSON.stringify({ product_id: 'ETH-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('emits sync message', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD', 'ETH-USD'],
        api_uri: 'ws://localhost:' + port,
      });

      orderbookSync.on('sync', productID => {
        assert.equal(productID, 'BTC-USD');
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });

  test('emits synced message', done => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/book?level=3')
      .reply(200, {
        asks: [],
        bids: [],
      });

    const server = testserver(port, () => {
      let orderbookSync = new CoinbasePro.OrderbookSync({
        product_ids: ['BTC-USD', 'ETH-USD'],
        api_uri: 'ws://localhost:' + port,
      });

      orderbookSync.on('synced', productID => {
        assert.equal(productID, 'BTC-USD');
      });
      orderbookSync.connect();
    });

    server.on('connection', socket => {
      socket.send(JSON.stringify({ product_id: 'BTC-USD' }));
      socket.on('message', () => {
        server.close();
        done();
      });
    });
  });
});
