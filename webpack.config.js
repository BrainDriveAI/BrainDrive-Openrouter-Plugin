const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
	mode: "development",
	entry: "./src/bootstrap",
	output: {
		// path: path.resolve(__dirname, "dist"),
		path: path.resolve(
			__dirname,
			"../../backend/plugins/775b61e5112a4c63aace0a1ac438c172/BrainDriveOpenRouter/frontend/dist"
		),
		publicPath: "auto",
		clean: true,
		library: {
			type: "var",
			name: "BrainDriveOpenRouter",
		},
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
	},
	module: {
		rules: [
			{
				test: /\.(ts|tsx)$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader", "postcss-loader"],
			},
		],
	},
	plugins: [
		new ModuleFederationPlugin({
			name: "BrainDriveOpenRouter",
			library: { type: "var", name: "BrainDriveOpenRouter" },
			filename: "remoteEntry.js",
			exposes: {
				"./ComponentOpenRouterKeys": "./src/ComponentOpenRouterKeys",
			},
			shared: {
				react: {
					singleton: true,
					requiredVersion: deps.react,
					eager: true,
				},
				"react-dom": {
					singleton: true,
					requiredVersion: deps["react-dom"],
					eager: true,
				},
			},
		}),
		new HtmlWebpackPlugin({
			template: "./public/index.html",
		}),
	],
	devServer: {
		port: 9007,
		static: {
			directory: path.join(__dirname, "public"),
		},
		hot: true,
	},
};
