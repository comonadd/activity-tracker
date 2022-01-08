const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const fs = require("fs");
const fse = require("fs-extra");

const DEV = process.env.NODE_ENV === "development";
const SRC = path.resolve(__dirname, "src");
const BUILD = path.resolve(__dirname, "build");
const DIST = path.resolve(__dirname, "dist");
const chromeOut = path.resolve(DIST, "chrome");
const firefoxOut = path.resolve(DIST, "firefox");

const babelOptions = {
  plugins: [
    [
      "babel-plugin-import",
      {
        libraryName: "@mui/material",
        libraryDirectory: "",
        camel2DashComponentName: false,
      },
      "core",
    ],
    [
      "babel-plugin-import",
      {
        libraryName: "@mui/icons-material",
        libraryDirectory: "",
        camel2DashComponentName: false,
      },
      "icons",
    ],
  ],
};

module.exports = {
  mode: DEV ? "development" : "production",
  entry: {
    dashboard: `${SRC}/dashboard.tsx`,
    options: `${SRC}/options.tsx`,
    background: `${SRC}/background.ts`,
  },
  output: {
    path: BUILD,
    filename: "[name].min.js", // string (default)
    publicPath: "/", // string
    uniqueName: "activity-tracker-chrome",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [path.resolve(__dirname, "src")],
        use: [
          {
            loader: "babel-loader",
            options: babelOptions,
          },
          {
            loader: "ts-loader",
            options: {
              configFile: DEV ? "tsconfig.dev.json" : "tsconfig.json",
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    modules: ["node_modules", path.resolve(__dirname, "app")],
    extensions: [".js", ".json", ".tsx", ".ts", ".css"],
    alias: {
      "~": SRC,
    },
  },
  devtool: DEV ? "inline-source-map" : "hidden-source-map", // enum
  context: __dirname, // string (absolute path!)
  target: "web", // enum

  optimization: {
    minimize: !DEV,
    chunkIds: "named",
    concatenateModules: true,
    mangleExports: true,
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: `${SRC}/dashboard.html`, to: BUILD },
        { from: `${SRC}/dashboard.css`, to: BUILD },
        { from: `${SRC}/options.html`, to: BUILD },
        { from: `${SRC}/images`, to: path.resolve(BUILD, "images") },
      ],
    }),

    // Create two extension directories with different manifests for chrome / firefox
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("AfterEmitPlugin", (compilation) => {
          fs.rmSync(DIST, { recursive: true, force: true });
          fs.mkdirSync(DIST);
          // chrome
          fse.copySync(BUILD, chromeOut);
          fs.copyFileSync(
            path.resolve(SRC, "chrome-manifest.json"),
            path.resolve(chromeOut, "manifest.json")
          );
          // firefox
          fse.copySync(BUILD, firefoxOut);
          fs.copyFileSync(
            path.resolve(SRC, "firefox-manifest.json"),
            path.resolve(firefoxOut, "manifest.json")
          );
        });
      },
    },
  ],
};
