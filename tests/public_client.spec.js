const assert = require('assert');
const nock = require('nock');

const CoinbasePro = require('../index.js');
const publicClient = new CoinbasePro.PublicClient();
const {
  EXCHANGE_API_URL,
  SANDBOX_API_URL,
  DEFAULT_PAIR,
  DEFAULT_TIMEOUT,
} = require('../lib/utilities');

suite('PublicClient', () => {
  teardown(() => nock.cleanAll());

  test('.constructor()', () => {
    let client = new CoinbasePro.PublicClient();
    assert.equal(client.apiURI, EXCHANGE_API_URL);
    assert.equal(client.productID, DEFAULT_PAIR);
    assert.equal(client.timeout, DEFAULT_TIMEOUT);

    client = new CoinbasePro.PublicClient({ sandbox: true });
    assert.equal(client.apiURI, SANDBOX_API_URL);
  });

  test('.constructor() (with custom timeout)', () => {
    let client = new CoinbasePro.PublicClient({
      sandbox: true,
      product_id: 'LTC-USD',
      timeout: 9000,
    });
    assert.equal(client.apiURI, SANDBOX_API_URL);
    assert.equal(client.productID, 'LTC-USD');
    assert.equal(client.timeout, 9000);
  });

  test('.constructor() (with custom api_uri)', () => {
    let client = new CoinbasePro.PublicClient({
      sandbox: true,
      api_uri: 'some_new_api_uri',
    });
    assert.equal(client.apiURI, 'some_new_api_uri');
    assert.equal(client.sandbox, true);
    assert.equal(client.productID, DEFAULT_PAIR);
  });

  suite('.request()', () => {
    test('handles errors', () => {
      nock(EXCHANGE_API_URL)
        .get('/some/path')
        .times(2)
        .reply(400, { message: 'some error' });

      const cbtest = new Promise((resolve, reject) => {
        publicClient.request('get', ['some', 'path'], {}, err => {
          if (err) {
            assert.equal(err.message, 'HTTP 400 Error: some error');
            assert.equal(err.response.statusCode, 400);
            assert.equal(err.data.message, 'some error');
            resolve();
          } else {
            reject();
          }
        });
      });

      const promisetest = publicClient
        .request('get', ['some', 'path'])
        .then(() => assert.fail('should have thrown an error'))
        .catch(err => {
          assert.equal(err.message, 'HTTP 400 Error: some error');
          assert.equal(err.response.statusCode, 400);
          assert(err.data.message, 'some error');
        });

      return Promise.all([cbtest, promisetest]);
    });
  });

  test('.getProductOrderBook()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/LTC-USD/book?level=3')
      .times(2)
      .reply(200, {
        asks: [],
        bids: [],
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductOrderBook(
        {
          product_id: 'LTC-USD',
          level: 3,
        },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }
          assert(data);
          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProductOrderBook({ product_id: 'LTC-USD', level: 3 })
      .then(data => assert(data));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductOrderBook() (with missing `product_id` implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-BTC/book?level=2')
      .reply(200, {
        asks: [],
        bids: [],
      });

    let client = new CoinbasePro.PublicClient({ product_id: 'ETH-BTC' });

    return client.getProductOrderBook({ level: 2 }).then(data => assert(data));
  });

  test('.getProductTrades()', () => {
    const expectedResponse = [
      {
        time: '2014-11-07T22:19:28.578544Z',
        trade_id: 74,
        price: '10.00000000',
        size: '0.01000000',
        side: 'buy',
      },
      {
        time: '2014-11-07T01:08:43.642366Z',
        trade_id: 73,
        price: '100.00000000',
        size: '0.01000000',
        side: 'sell',
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/products/LTC-USD/trades')
      .times(2)
      .reply(200, expectedResponse);

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTrades(
        { product_id: 'LTC-USD' },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }
          assert.deepEqual(data, expectedResponse);
          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProductTrades({ product_id: 'LTC-USD' })
      .then(data => assert.deepEqual(data, expectedResponse));

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductTrades() (with missing `product_id` implying default product ID)', () => {
    let expectedResponse = [
      {
        time: '2014-11-07T22:19:28.578544Z',
        trade_id: 74,
        price: '10.00000000',
        size: '0.01000000',
        side: 'buy',
      },
    ];

    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/trades')
      .reply(200, expectedResponse);

    return publicClient
      .getProductTrades()
      .then(data => assert.deepEqual(data, expectedResponse));
  });

  test('.getProductTicker()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/ticker')
      .times(2)
      .reply(200, {
        trade_id: 'test-id',
        price: '9.00',
        size: '5',
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductTicker(
        { product_id: 'ETH-USD' },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }

          assert.equal(data.trade_id, 'test-id');
          assert(data.price, '9.00');
          assert(data.size, '5');

          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProductTicker({ product_id: 'ETH-USD' })
      .then(data => {
        assert.equal(data.trade_id, 'test-id');
        assert.equal(data.price, '9.00');
        assert.equal(data.size, '5');
      });

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductTicker() (with missing `product_id` implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/ticker')
      .reply(200, {
        trade_id: 'test-id',
        price: '90.00',
        size: '2',
      });

    return publicClient.getProductTicker().then(data => {
      assert.equal(data.trade_id, 'test-id');
      assert.equal(data.price, '90.00');
      assert.equal(data.size, '2');
    });
  });

  suite('.getProductTradeStream()', () => {
    const from = 8408014;
    const to = 8409426;

    test('streams trades', done => {
      nock.load('./tests/mocks/pubclient_stream_trades.json');

      let last = from;
      let current;

      publicClient
        .getProductTradeStream({
          product_id: 'BTC-USD',
          tradesFrom: from,
          tradesTo: to,
          limit: 100,
        })
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert((current = to - 1));
          done();
        })
        .on('error', err => {
          assert.fail(err);
        });
    });

    test('streams trades (with missing `product_id` implying default product ID)', done => {
      nock.load('./tests/mocks/pubclient_stream_trades.json');

      let last = from;
      let current;

      publicClient
        .getProductTradeStream({ tradesFrom: from, tradesTo: to })
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert((current = to - 1));
          done();
        })
        .on('error', err => {
          assert.fail(err);
        });
    });

    test('.getProductTradeStream() with function', done => {
      nock.load('./tests/mocks/pubclient_stream_trades_function.json');
      let last = from;
      let current;

      publicClient
        .getProductTradeStream({
          product_id: 'BTC-USD',
          tradesFrom: from,
          tradesTo: trade => Date.parse(trade.time) >= 1463068800000,
        })
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert.equal(last, 8409426, last);
          done();
        });
    });

    test('.getProductTradeStream() with current date function', done => {
      nock.load('./tests/mocks/pubclient_stream_trades_function.json');
      let last = from;
      let current;

      publicClient
        .getProductTradeStream({
          product_id: 'BTC-USD',
          tradesFrom: from,
          tradesTo: trade => Date.parse(trade.time) >= Date.now(),
        })
        .on('data', data => {
          current = data.trade_id;
          assert.equal(typeof current, 'number');
          assert.equal(
            current,
            last + 1,
            current + ' is next in series, last: ' + last
          );
          last = current;
        })
        .on('end', () => {
          assert.equal(last, 8409514, last);
          done();
        });
    });
  });

  test('.getProductHistoricRates()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/candles?granularity=60')
      .times(2)
      .reply(200, [
        [1514273340, 759.75, 759.97, 759.75, 759.97, 8.03891157],
        [1514273280, 758.99, 759.74, 758.99, 759.74, 17.36616621],
        [1514273220, 758.99, 759, 759, 759, 10.6524787],
      ]);

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProductHistoricRates(
        { product_id: 'ETH-USD', granularity: 60 },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }

          assert.equal(data[0][0], 1514273340);
          assert.equal(data[0][1], 759.75);
          assert.equal(data[2][0], 1514273220);

          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProductHistoricRates({ product_id: 'ETH-USD', granularity: 60 })
      .then(data => {
        assert.equal(data[0][0], 1514273340);
        assert.equal(data[0][1], 759.75);
        assert.equal(data[2][0], 1514273220);
      });

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProductHistoricRates() (with missing `product_id` implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-BTC/candles?granularity=60')
      .reply(200, [
        [1514273220, 15399.99, 15400, 15399, 15399, 0.369797],
        [1514273160, 15399.99, 15400, 15400, 15400, 0.673643],
        [1514273100, 15399.99, 15400, 15400, 15400, 0.849436],
      ]);

    let client = new CoinbasePro.PublicClient({ product_id: 'ETH-BTC' });

    return client.getProductHistoricRates({ granularity: 60 }).then(data => {
      assert.equal(data[0][0], 1514273220);
      assert.equal(data[0][1], 15399.99);
      assert.equal(data[2][0], 1514273100);
    });
  });

  test('.getProduct24HrStats()', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/ETH-USD/stats')
      .times(2)
      .reply(200, {
        open: '720',
        high: '770',
        low: '710',
        volume: '110000',
        last: '760',
        volume_30day: '9800000',
      });

    const cbtest = new Promise((resolve, reject) => {
      publicClient.getProduct24HrStats(
        { product_id: 'ETH-USD' },
        (err, resp, data) => {
          if (err) {
            reject(err);
          }

          assert.equal(data.open, 720);
          assert.equal(data.high, 770);
          assert.equal(data.volume, 110000);

          resolve();
        }
      );
    });

    const promisetest = publicClient
      .getProduct24HrStats({ product_id: 'ETH-USD' })
      .then(data => {
        assert.equal(data.open, 720);
        assert.equal(data.high, 770);
        assert.equal(data.volume, 110000);
      });

    return Promise.all([cbtest, promisetest]);
  });

  test('.getProduct24HrStats() (with missing `product_id` implying default product ID)', () => {
    nock(EXCHANGE_API_URL)
      .get('/products/BTC-USD/stats')
      .reply(200, {
        open: '14000',
        high: '15700',
        low: '13800',
        volume: '17400',
        last: '15300',
        volume_30day: '1100000',
      });

    return publicClient.getProduct24HrStats().then(data => {
      assert.equal(data.open, 14000);
      assert.equal(data.high, 15700);
      assert.equal(data.volume, 17400);
    });
  });
});
