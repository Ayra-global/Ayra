/// <reference types="node" />
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
    test: {
        exclude: ["**/node_modules/**", "**/dist/**"],
    },
});
