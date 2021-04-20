module.exports = {
  apps : [{
    name: "scanner",
    script: 'node',
    args: ' -r ts-node/register src/scanner/poller.ts',
    env: { 
      NODE_ENV: "production",
      TF_CPP_MIN_LOG_LEVEL: 2,
    }
  },{
    name: 'rater',
    script: 'node',
    args: ' -r ts-node/register src/rating/rating.ts',
    env: { 
      NODE_ENV: "production",
      TF_CPP_MIN_LOG_LEVEL: 2,
    }
  },{
    name: 'server',
    script: 'node',
    args: ' -r ts-node/register src/server/server.ts',
    env: { 
      NODE_ENV: "production",
      TF_CPP_MIN_LOG_LEVEL: 2,
    }
  }]
};
