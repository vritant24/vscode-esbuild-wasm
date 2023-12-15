import { beforeAll, test } from "vitest";
import * as esbuild from 'esbuild-wasm/lib/browser';
import { TsVSCodePlugin } from "../esbuild";

const createEsbuild = async () => {
    await esbuild.initialize({    
        wasmURL: 'C:\\repos\\playground\\esbuild-wasm\\esb\\node_modules\\esbuild-wasm\\esbuild.wasm',
    });
};

beforeAll(async () => {
    try {
        await createEsbuild();
    } catch (error) {
        console.log(error);
    }
});

test("Sample test", async () => {
    const buildOptions: esbuild.BuildOptions = {
        plugins: [
            new TsVSCodePlugin()
        ]
    };
});