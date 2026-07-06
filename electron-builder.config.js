const baseConfig = {
    appId: "com.renegade.app",
    productName: "Renegade",
    directories: {
        output: "release",
        buildResources: "build",
    },
    files: ["dist-main/index.js", "dist-preload/index.js", "dist-renderer/**/*"],
    extraMetadata: {
        version: process.env.VITE_APP_VERSION,
    },
    win: {
        icon: "build/icon.png",
        target: [{ target: "nsis" }, { target: "zip" }],
    },
};

module.exports = baseConfig;
