import { Mastra } from '@mastra/core';
import { GoodshepherdModelGateway } from '../gateway/GoodshepherdModelGateway.js';

export const mastra = new Mastra({
  gateways: {
    goodshepherd: new GoodshepherdModelGateway(),
  },
});
