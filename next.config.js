
const path = require("path");

module.exports = {
    webpack: (config, { isServer, webpack }) => {
        return config;
    },
    trailingSlash: true,
    webpackDevMiddleware: config => {
        config.watchOptions = {
            poll: 1000,
            aggregateTimeout: 300
        }
        return config
    },
    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')]
    }
}