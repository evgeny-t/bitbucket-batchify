const path = require('path');
const webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          plugins: ['transform-decorators-legacy' ],
          presets: ['es2015', 'stage-0', 'react']
        }

      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'cloud.html' },
      { from: 'privacypolicy.htm' },
      { from: 'connect.json' },
    ]),
  ],
};
