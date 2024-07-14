const path = require('path');

module.exports = {
  entry: './public/tesseractWorker.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false  // Ignore the 'fs' module for browser builds
    }
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 3000
  }
};
