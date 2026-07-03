'use strict';

// jsdom (used as the Jest test environment) does not provide TextEncoder /
// TextDecoder, which react-router v7 relies on at import time. Polyfill them
// from Node's util module so the test environment matches the browser.
const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Opt in to React's act() testing environment so updates wrapped in act()
// don't emit "not wrapped in act(...)" warnings.
global.IS_REACT_ACT_ENVIRONMENT = true;
