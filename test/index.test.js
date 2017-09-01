// @flow

import flatMapChanges from '../source/index.js';
import highland from 'highland';

const streamError = (error: Error) => ({
  __HighlandStreamError__: true,
  error
});

describe('flat map changes', () => {
  let stream, flatMapper, getFlatMapped$, source$;

  beforeEach(() => {
    let mockFlatMapped$;

    flatMapper = jest.fn(() => {
      mockFlatMapped$ = highland();
      jest.spyOn(mockFlatMapped$, 'destroy');
      return mockFlatMapped$;
    });

    getFlatMapped$ = () => mockFlatMapped$;

    source$ = highland();
    jest.spyOn(source$, 'destroy');

    stream = flatMapChanges(flatMapper, source$);
  });

  it('should return a stream', () => {
    expect(highland.isStream(stream)).toBe(true);
  });

  it('should call the flatMapper when the upstream gets a new token', () => {
    source$.write('bar');

    stream.each(() => {});

    expect(flatMapper).toBeCalledWith('bar');
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

    stream.each(() => {});
    const s = getFlatMapped$();

    source$.write('bar');

    expect(s.destroy).toHaveBeenCalled();
  });

  it('should destroy the upstream when stream is destroyed', () => {
    stream.destroy();

    expect(source$.destroy).toBeCalledWith();
  });

  it('should destroy the downstream when stream is destroyed', () => {
    expect.assertions(2);

    source$.write('foo');

    stream.each(() => {});

    const s = getFlatMapped$();

    stream.destroy();

    expect(source$.destroy).toBeCalledWith();
    expect(s.destroy).toBeCalledWith();
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
