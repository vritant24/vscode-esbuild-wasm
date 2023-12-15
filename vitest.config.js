// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/web/test/**/*.test.ts'],
        environment: 'miniflare',
        verbose: true,
    },
    verbose: true,
});
