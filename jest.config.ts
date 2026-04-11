import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const customConfig: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

// Wrap to merge transformIgnorePatterns after next/jest sets its own
async function jestConfig(): Promise<Config> {
  const nextConfig = await createJestConfig(customConfig)();
  return {
    ...nextConfig,
    transformIgnorePatterns: ["/node_modules/(?!(jose)/)"],
  };
}

export default jestConfig;
