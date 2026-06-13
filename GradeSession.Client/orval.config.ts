import { defineConfig } from 'orval';

export default defineConfig({
  gradeSessionApi: {
    input: {
      target: 'http://localhost:5269/swagger/v1/swagger.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/shared/api/generated/grade-session-api.ts',
      schemas: './src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/shared/api/http/axios-instance.ts',
          name: 'apiClient',
        },
      },
    },
  },
});