// @flow

import { describe, beforeEach, spyOn, it, expect, jasmine } from './jasmine.js';

import flatMapChanges from '../source/index.js';
import highland from 'highland';

const streamError = (error: Error) => ({
  __HighlandStreamError__: true,
  error
});

describe('flat map changes', () => {
  let stream, flatMapper, getFlatMapped$, source$;

  beforeEach(() => {
    flatMapper = jasmine.createSpy('flatMapper').and.callFake(() => {
      const flatMapped$ = highland();
      spyOn(flatMapped$, 'destroy').and.callThrough();
      return flatMapped$;
    });

    getFlatMapped$ = () => flatMapper.calls.first().returnValue;

    source$ = highland();
    spyOn(source$, 'destroy');

    stream = flatMapChanges(flatMapper, source$);
  });

  it('should return a stream', () => {
    expect(highland.isStream(stream)).toBe(true);
  });

  it('should call the flatMapper when the upstream gets a new token', () => {
    source$.write('bar');

    stream.each(() => {});

    expect(flatMapper).toHaveBeenCalledOnceWith('bar');
  });

  it('should push errors from upstream downstream', done => {
    source$.write(streamError(new Error('boom!')));
    source$.end();

    stream
      .errors(err => {
        expect(err).toEqual(new Error('boom!'));
        done();
      })
      .each(() => {});
  });

  it('should push errors from flatMapped stream downstream', done => {
    source$.write('foo');

    stream
      .errors(err => {
        expect(err).toEqual(new Error('boom!'));
        done();
      })
      .each(() => {});

    getFlatMapped$().write(streamError(new Error('boom!')));
  });

  it('should push a value from flatMapped stream downstream', done => {
    source$.write('foo');

    stream.each(x => {
      expect(x).toBe('bar');
      done();
    });

    getFlatMapped$().write('bar');
  });

  it('should destroy the downstream when the upstream gets a new token', () => {
    source$.write('foo');
    source$.write('bar');

    stream.each(() => {});

    const s = getFlatMapped$();

    expect(s.destroy).toHaveBeenCalled();
  });

  it('should destroy the upstream when downstream is destroyed', () => {
    stream.destroy();

    expect(source$.destroy).toHaveBeenCalledOnce();
  });

  it('should push nil from upstream to downstream', done => {
    source$.write(highland.nil);

    stream.done(() => done());
  });

  it('should be able to destroy synchronously', done => {
    const s = highland();

    s.write(1);

    let i = 0;

    flatMapChanges(
      () =>
        highland((push, next) => {
          setTimeout(function() {
            push(null, i++);

            if (i < 5) next();
          });
        }),
      s
    ).each(() => {
      if (i < 10) s.write(i);
      else done();
    });
  });
});
