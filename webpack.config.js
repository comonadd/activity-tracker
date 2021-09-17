const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

const DEV = process.env.NODE_ENV === "development";
const SRC = path.resolve(__dirname, "src");
const BUILD = path.resolve(__dirname, "build");

module.exports = {
  mode: DEV ? "development" : "production",
  entry: {
      "dashboard": `${SRC}/dashboard.tsx`,
      "options": `${SRC}/options.tsx`,
      "popup": `${SRC}/popup.ts`,
      "background": `${SRC}/background.ts`,
  },
  output: {
    path: BUILD,
    filename: "[name].min.js", // string (default)
    publicPath: "/assets/", // string
    uniqueName: "activity-tracker-chrome",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [
          path.resolve(__dirname, "src")
        ],
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    modules: ["node_modules",path.resolve(__dirname, "app")],
    extensions: [".js", ".json", ".tsx", ".ts", ".css"],
    alias: {},
  },
  performance: {
    hints: "warning", // enum
    maxAssetSize: 200000, // int (in bytes),
    maxEntrypointSize: 400000, // int (in bytes)
    assetFilter: function(assetFilename) {
      // Function predicate that provides asset filenames
      return assetFilename.endsWith('.css') || assetFilename.endsWith('.js');
    }
  },
  devtool: "source-map", // enum
  context: __dirname, // string (absolute path!)
  target: "web", // enum
  plugins: [
     new CopyPlugin({
      patterns: [
        { from: `${SRC}/popup.html`, to: BUILD },
        { from: `${SRC}/popup.css`, to: BUILD },
        { from: `${SRC}/dashboard.html`, to: BUILD },
        { from: `${SRC}/dashboard.css`, to: BUILD },
        { from: `${SRC}/options.html`, to: BUILD },
        { from: `${SRC}/manifest.json`, to: BUILD },
      ],
    }),
  ],
};
