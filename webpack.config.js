import path from "path"
import HTMLWebpackPlugin from "html-webpack-plugin"

export default {
  mode: "development",
  entry: "./src/client/index.tsx",
  output: {
    filename: "bundle.js",
    path: path.resolve("dist/public"),
    publicPath: "/",
  },
  target: "web",
  module: {
    rules:[
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: "babel-loader"
      },
      {
        test: /\.html$/,
        use: "html-loader"
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /server/,
        use: [{
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.webpack.json"
          }
        }]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ], 
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HTMLWebpackPlugin({
      template: "src/client/index.html"
    }),
  ]
}