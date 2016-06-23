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
  default as flatMapChanges,
  flatMapChangesWithSourceListener
} from '../source/index.js';

import highland from 'highland';

function StreamError (err) {
  this.__HighlandStreamError__ = true;
  this.error = err;
}

describe('flat map changes', () => {

  let stream, changeToken, flatMapper,
    listener, flatMapped$, source$;

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
  });

  it('should return a stream', () => {
    expect(highland.isStream(stream))
      .toBe(true);
  });

  it('should call the listener when the upstream gets a new token', () => {
    source$.write('bar');
    source$.write('foo');

    stream.each(() => {});

    expect(listener)
      .toHaveBeenCalledOnceWith('foo');
  });

  it('should call the flatMapper when the upstream gets a new token', () => {
    source$.write('bar');

    stream.each(() => {});

    expect(flatMapper)
      .toHaveBeenCalledOnceWith('bar');
  });

  it('should push errors from upstream downstream', (done) => {
    source$.write(new StreamError(
        new Error('boom!')
      ));
    source$.end();

    stream
      .errors(err => {
        expect(err)
          .toEqual(new Error('boom!'));
        done();
      })
      .each(() => {});
  });

  it('should push errors from flatMapped stream downstream', (done) => {
    source$.write('foo');
    flatMapped$.write(new StreamError(
      new Error('boom!')
    ));

    stream
      .errors(err => {
        expect(err)
          .toEqual(new Error('boom!'));
        done();
      })
      .each(() => {});
  });

  it('should push a value from flatMapped stream downstream', (done) => {
    source$.write('foo');
    flatMapped$.write('bar');

    stream
      .each(x => {
        expect(x).toBe('bar');
        done();
      });
  });

  it('should destroy the downstream when the upstream gets a new token', () => {
    source$.write('foo');
    source$.write('bar');

    stream.each(() => {});

    expect(flatMapped$.destroy)
      .toHaveBeenCalledOnce();
  });

  it('should destroy the upstream when downstream is destroyed', () => {
    stream.destroy();

    expect(source$.destroy)
      .toHaveBeenCalledOnce();
  });

  it('should push nil from upstream to downstream', (done) => {
    source$.write(highland.nil);

    stream.done(() => done());
  });

  it('should be able to destroy synchronously', (done) => {
    const s = highland();

    s.write(1);

    let i = 0;

    flatMapChanges(
      () => highland((push, next) => {
        setTimeout(function () {
          push(null, i++);

          if (i < 5)
            next();
        });
      }),
      s
    )
    .each(() => {
      if (i < 10)
        s.write(i);
      else
        done();
    });
  });
});
