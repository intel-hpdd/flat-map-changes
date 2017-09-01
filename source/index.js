// @flow

//
// Copyright (c) 2017 Intel Corporation. All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

import highland from 'highland';

import type { HighlandStreamT } from 'highland';

export default <A, B>(
  data$Fn: (a: A) => HighlandStreamT<B>,
  in$: HighlandStreamT<A>
): HighlandStreamT<B> => {
  let data$: ?HighlandStreamT<B>;

  return highland((push, next) => {
    in$.pull((err, x) => {
      if (err) {
        push(err);
        return next();
      }

      if (data$) {
        data$.destroy();
        data$ = null;
      }

      if (x === highland.nil) {
        push(null, highland.nil);
      } else {
        data$ = data$Fn(x);

        data$
          .errors(e => {
            setTimeout(() => push(e));
          })
          .each(x => {
            setTimeout(() => push(null, x));
          });

        next();
      }
    });
  }).onDestroy(() => {
    in$.destroy();

    if (data$) data$.destroy();
  });
};
