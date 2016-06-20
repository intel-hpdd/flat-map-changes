// @flow

import {
  describe,
  beforeEach,
  spyOn,
  it,
  expect,
  jasmine
} from './jasmine.js';

import {
  flatMapChangesWithSourceListener
} from '../source/index.js';

import highland from 'highland';


function StreamError (err) {
  this.__HighlandStreamError__ = true;
  this.error = err;
}

describe('flat map changes', () => {

  let stream, changeToken, flatMapper,
    listener, flatMapped$, source$, sink;

  beforeEach(() => {
    flatMapped$ = highland();
    spyOn(flatMapped$, 'destroy')
        .and
        .callThrough();

    flatMapper = jasmine
        .createSpy('flatMapper')
        .and
        .returnValue(flatMapped$);

    source$ = highland();
    spyOn(source$, 'destroy');

    changeToken = {};
    listener = jasmine
        .createSpy('listener')
        .and
        .returnValue(changeToken);

    stream = flatMapChangesWithSourceListener(
        listener,
        flatMapper,
        source$
      );

    sink = jasmine
        .createSpy('sink');
    stream
        .pull(sink);
  });

  it('should return a stream', () => {
    expect(highland.isStream(stream))
      .toBe(true);
  });

  it('should call the listener when the upstream gets a new token', () => {
    source$.write('bar');
    source$.write('foo');

    expect(listener)
      .toHaveBeenCalledOnceWith('foo');
  });

  it('should call the flatMapper when the upstream gets a new token', () => {
    source$.write('bar');

    expect(flatMapper)
      .toHaveBeenCalledOnceWith('bar');
  });

  it('should push errors from upstream downstream', () => {
    source$.write(new StreamError(
        new Error('boom!')
      ));

    expect(sink)
      .toHaveBeenCalledOnceWith(new Error('boom!'), undefined);
  });

  it('should push errors from flatMapped stream downstream', () => {
    source$.write('foo');
    flatMapped$.write(new StreamError(
      new Error('boom!')
    ));

    expect(sink)
      .toHaveBeenCalledOnceWith(new Error('boom!'), undefined);
  });

  it('should push a value from flatMapped stream downstream', () => {
    source$.write('foo');
    flatMapped$.write('bar');

    expect(sink)
      .toHaveBeenCalledOnceWith(null, 'bar');
  });

  it('should destroy the downstream when the upstream gets a new token', () => {
    source$.write('foo');
    source$.write('bar');

    expect(flatMapped$.destroy)
      .toHaveBeenCalledOnce();
  });

  it('should destroy the upstream when downstream is destroyed', () => {
    stream.destroy();

    expect(source$.destroy)
      .toHaveBeenCalledOnce();
  });

  it('should push nil from upstream to downstream', () => {
    source$.write(highland.nil);

    expect(sink)
      .toHaveBeenCalledOnceWith(null, highland.nil);
  });
});
