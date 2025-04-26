module.exports = {
	apps: [
		{
			name: "btserver",
			script: "./server.js",
			instances: "max",
			exec_mode: "cluster",
			watch: false,
		},
	],
}
