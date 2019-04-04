import chai, { assert } from 'chai';
import sinon from 'sinon';

global.assert = assert;
global.sinon = sinon;
global.AssertionError = chai.AssertionError;
