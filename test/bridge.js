const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// bridge의 최초 hello가 페이지 로딩보다 먼저 와도, 페이지의 pull 요청으로
// hello와 data가 다시 전달되는지 확인한다.
const messages = [], listeners = {};
const window = {
  location: { origin: 'https://pyw31337.github.io' },
  postMessage: (data, targetOrigin) => messages.push({ data, targetOrigin }),
  addEventListener: (type, listener) => { listeners[type] = listener; }
};
const chrome = {
  runtime: {
    getManifest: () => ({ version: '0.14.4' }),
    sendMessage: () => {}
  },
  storage: {
    local: {
      get: (_keys, callback) => callback({}),
      set: () => {}
    },
    onChanged: { addListener: () => {} }
  }
};

vm.runInNewContext(fs.readFileSync('extension/bridge.js', 'utf8'), { window, chrome, location: window.location });
assert.deepStrictEqual(messages.map(m => m.data.type), ['hello', 'data'], '시작할 때 연결 정보를 보낸다');
assert(messages.every(m => m.targetOrigin === window.location.origin), '현재 사이트에만 메시지를 보낸다');

messages.length = 0;
listeners.message({ source: window, data: { app: 'letsbuy-web', type: 'pull' } });
assert.deepStrictEqual(messages.map(m => m.data.type), ['hello', 'data'], 'pull 요청 뒤 연결 정보와 데이터를 다시 보낸다');
console.log('BRIDGE ALL PASS');
