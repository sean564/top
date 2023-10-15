const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = {
    context: __dirname,
    entry: ["./src/main.ts", "./src/css/styles.css", "./src/index.html"],
    mode: 'production',
    // devtool:"source-map",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "./dist/",
        clean: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'My App',
            minify: true,
            template: './src/index.html',
            filename: 'index.html',
        }),
        new MiniCssExtractPlugin({
            filename: "styles.css",
        }),
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                  ],
            },
            {
                test: /\.html$/i,
                loader: "html-loader",
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            },
            {
                test: /\.glsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                      name: '[name].[ext]'
                    }
                  }
                ]
            }
        ]
    },
    optimization: {
        minimizer: [
            '...',
            new CssMinimizerPlugin(),
        ],
    },
    devServer: {
        contentBase: './dist',
    },
    
    resolve: {
        extensions: [".ts"]
    },
    
}