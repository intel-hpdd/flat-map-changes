// @flow

//
// INTEL CONFIDENTIAL
//
// Copyright 2013-2016 Intel Corporation All Rights Reserved.
//
// The source code contained or described herein and all documents related
// to the source code ("Material") are owned by Intel Corporation or its
// suppliers or licensors. Title to the Material remains with Intel Corporation
// or its suppliers and licensors. The Material contains trade secrets and
// proprietary and confidential information of Intel or its suppliers and
// licensors. The Material is protected by worldwide copyright and trade secret
// laws and treaty provisions. No part of the Material may be used, copied,
// reproduced, modified, published, uploaded, posted, transmitted, distributed,
// or disclosed in any way without Intel's prior express written permission.
//
// No license under any patent, copyright, trade secret or other intellectual
// property right is granted to or conferred upon you by disclosure or delivery
// of the Materials, either expressly, by implication, inducement, estoppel or
// otherwise. Any license under such intellectual property rights must be
// express and approved by Intel in writing.

import highland from 'highland';
import * as fp from 'intel-fp';

import type {
  HighlandStreamT
} from 'highland';

type mixedTo$T = (data:mixed) => HighlandStreamT<mixed>;
type mixedToMixedOrNullT = (x:mixed) => (mixed | null);

export const flatMapChangesWithSourceListener = fp.curry(3,
  (sourceChangeFn:mixedToMixedOrNullT, data$Fn:mixedTo$T, in$:HighlandStreamT<mixed>):HighlandStreamT<mixed> => {
    let data$:?HighlandStreamT<mixed>;

    function consume (error, x, push, next) {
      if (error) {
        push(error);
        return next();
      }

      if (data$) {
        if (sourceChangeFn)
          push(null, sourceChangeFn(x));

        data$.destroy();
        data$ = null;
      }

      if (x === highland.nil) {
        push(null, x);
      } else {
        data$ = data$Fn(x);

        data$
          .errors(e => push(e))
          .each(x => push(null, x));

        next();
      }
    }

    const in2$ = in$.consume(consume);

    // $FlowIgnore: flow does not recognize this monkey-patching.
    in2$.destroy = in$.destroy.bind(in$);

    return in2$;
  }
);


export default flatMapChangesWithSourceListener(null);
