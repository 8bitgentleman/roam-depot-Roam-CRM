module.exports = {
    externals: {
        react: "React",
        "chrono-node": "ChronoNode"
    },
    externalsType: "window",
    entry: './src/index.js',
    output: {
        filename: 'extension.js',
        path: __dirname,
        library: {
            type: "module",
        }
    },
    experiments: {
        outputModule: true,
    },
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }
        ]
    },
    mode: "production",
};
