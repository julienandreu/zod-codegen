## <small>1.6.2 (2026-01-19)</small>

- fix: improve URL construction and filter undefined query params (#58) ([b9c3d32](https://github.com/julienandreu/zod-codegen/commit/b9c3d32)), closes [#58](https://github.com/julienandreu/zod-codegen/issues/58)
- chore(deps): bump the dev-dependencies group across 1 directory with 5 updates (#57) ([30110fd](https://github.com/julienandreu/zod-codegen/commit/30110fd)), closes [#57](https://github.com/julienandreu/zod-codegen/issues/57)

## <small>1.6.1 (2026-01-09)</small>

- Merge pull request #55 from julienandreu/fix/integration-tests-timeout ([1e48796](https://github.com/julienandreu/zod-codegen/commit/1e48796)), closes [#55](https://github.com/julienandreu/zod-codegen/issues/55)
- fix: remove npm build from integration tests to prevent timeouts ([1cfceac](https://github.com/julienandreu/zod-codegen/commit/1cfceac))

## 1.6.0 (2026-01-09)

- Merge pull request #54 from julienandreu/feat/response-handling-policies ([3f99c8f](https://github.com/julienandreu/zod-codegen/commit/3f99c8f)), closes [#54](https://github.com/julienandreu/zod-codegen/issues/54)
- fix: add path mapping for zod-codegen/policies in examples ([d3dd5c9](https://github.com/julienandreu/zod-codegen/commit/d3dd5c9))
- fix: export policies from package.json ([c1a3344](https://github.com/julienandreu/zod-codegen/commit/c1a3344))
- fix: prevent duplicate method names for HEAD/OPTIONS with same operationId ([8c0b891](https://github.com/julienandreu/zod-codegen/commit/8c0b891))
- fix: remove invalid semver-diff override causing CI failure ([278db05](https://github.com/julienandreu/zod-codegen/commit/278db05))
- fix: remove unnecessary Promise.resolve in error handler ([d730ef4](https://github.com/julienandreu/zod-codegen/commit/d730ef4))
- fix: update example to use zod-codegen/policies import path ([c7e3b07](https://github.com/julienandreu/zod-codegen/commit/c7e3b07))
- fix: update TypeScript module resolution for Node.js ESM compatibility ([2d8f6a0](https://github.com/julienandreu/zod-codegen/commit/2d8f6a0))
- fix: use extensionless imports in TypeScript source files ([dc0698c](https://github.com/julienandreu/zod-codegen/commit/dc0698c))
- ci: add build output verification step to diagnose module resolution issue ([5174320](https://github.com/julienandreu/zod-codegen/commit/5174320))
- docs: fix examples documentation ([04d6db8](https://github.com/julienandreu/zod-codegen/commit/04d6db8))
- docs: update Node.js version requirement in CONTRIBUTING.md ([16cdc1e](https://github.com/julienandreu/zod-codegen/commit/16cdc1e))
- docs: update PR description with latest test count ([f2ef4a8](https://github.com/julienandreu/zod-codegen/commit/f2ef4a8))
- test: add comprehensive test suite to increase confidence ([48a7e2d](https://github.com/julienandreu/zod-codegen/commit/48a7e2d))
- test: add tests for buildBasicTypeFromSchema edge cases ([c567c51](https://github.com/julienandreu/zod-codegen/commit/c567c51))
- test: improve code coverage for code-generator.service.ts ([edbc92a](https://github.com/julienandreu/zod-codegen/commit/edbc92a))
- refactor: completely remove policy system ([7c6439a](https://github.com/julienandreu/zod-codegen/commit/7c6439a))
- refactor: implement quality improvements ([a5b1b14](https://github.com/julienandreu/zod-codegen/commit/a5b1b14))
- refactor: remove policies export, keep zod-codegen as dev-dependency ([4eae513](https://github.com/julienandreu/zod-codegen/commit/4eae513))
- refactor: remove unused code and improve Reporter ([51ae06a](https://github.com/julienandreu/zod-codegen/commit/51ae06a))
- feat: add response handling policies system ([ad98229](https://github.com/julienandreu/zod-codegen/commit/ad98229))

## <small>1.5.1 (2026-01-05)</small>

- Merge pull request #52 from julienandreu/dependabot/npm_and_yarn/production-dependencies-3204786a64 ([c2fa562](https://github.com/julienandreu/zod-codegen/commit/c2fa562)), closes [#52](https://github.com/julienandreu/zod-codegen/issues/52)
- Merge pull request #53 from julienandreu/dependabot/npm_and_yarn/dev-dependencies-a389c980d8 ([408b886](https://github.com/julienandreu/zod-codegen/commit/408b886)), closes [#53](https://github.com/julienandreu/zod-codegen/issues/53)
- fix: remove useless default value in import-builder destructuring ([7bb9325](https://github.com/julienandreu/zod-codegen/commit/7bb9325))
- chore(deps-dev): bump the dev-dependencies group across 1 directory with 6 updates ([f869a2a](https://github.com/julienandreu/zod-codegen/commit/f869a2a))
- chore(deps): bump zod in the production-dependencies group ([a51b0f1](https://github.com/julienandreu/zod-codegen/commit/a51b0f1))

## 1.5.0 (2025-12-22)

- Merge pull request #44 from julienandreu/dependabot/github_actions/actions/upload-artifact-6 ([cebfd55](https://github.com/julienandreu/zod-codegen/commit/cebfd55)), closes [#44](https://github.com/julienandreu/zod-codegen/issues/44)
- Merge pull request #45 from julienandreu/dependabot/npm_and_yarn/dev-dependencies-ab633d47b1 ([8663f40](https://github.com/julienandreu/zod-codegen/commit/8663f40)), closes [#45](https://github.com/julienandreu/zod-codegen/issues/45)
- Merge pull request #46 from julienandreu/dependabot/npm_and_yarn/production-dependencies-eefc12583a ([eac5279](https://github.com/julienandreu/zod-codegen/commit/eac5279)), closes [#46](https://github.com/julienandreu/zod-codegen/issues/46)
- Merge pull request #47 from julienandreu/dependabot/npm_and_yarn/types/node-25.0.2 ([687ce64](https://github.com/julienandreu/zod-codegen/commit/687ce64)), closes [#47](https://github.com/julienandreu/zod-codegen/issues/47)
- Merge pull request #49 from julienandreu/dependabot/npm_and_yarn/production-dependencies-5419ff3310 ([1d6485c](https://github.com/julienandreu/zod-codegen/commit/1d6485c)), closes [#49](https://github.com/julienandreu/zod-codegen/issues/49)
- Merge pull request #50 from julienandreu/feat/circular-dependency-detection ([527cbb6](https://github.com/julienandreu/zod-codegen/commit/527cbb6)), closes [#50](https://github.com/julienandreu/zod-codegen/issues/50)
- feat: detect circular dependencies and wrap with z.lazy() ([4f5f545](https://github.com/julienandreu/zod-codegen/commit/4f5f545))
- chore(deps-dev): bump @types/node from 24.10.1 to 25.0.2 ([da9bbc7](https://github.com/julienandreu/zod-codegen/commit/da9bbc7))
- chore(deps-dev): bump the dev-dependencies group with 2 updates ([29ad3ef](https://github.com/julienandreu/zod-codegen/commit/29ad3ef))
- chore(deps): bump zod in the production-dependencies group ([391d6ea](https://github.com/julienandreu/zod-codegen/commit/391d6ea))
- chore(deps): bump zod in the production-dependencies group ([41177c8](https://github.com/julienandreu/zod-codegen/commit/41177c8))
- ci(deps): bump actions/upload-artifact from 4 to 6 ([c19e254](https://github.com/julienandreu/zod-codegen/commit/c19e254))

## <small>1.4.1 (2025-12-08)</small>

- Merge branch 'refactor/build-config-and-class-exports' of github.com:julienandreu/zod-codegen into r ([bdd9bc5](https://github.com/julienandreu/zod-codegen/commit/bdd9bc5))
- Merge pull request #41 from julienandreu/dependabot/npm_and_yarn/tar-7.5.2 ([192cd47](https://github.com/julienandreu/zod-codegen/commit/192cd47)), closes [#41](https://github.com/julienandreu/zod-codegen/issues/41)
- Merge pull request #43 from julienandreu/refactor/build-config-and-class-exports ([61de21b](https://github.com/julienandreu/zod-codegen/commit/61de21b)), closes [#43](https://github.com/julienandreu/zod-codegen/issues/43)
- refactor: improve build configuration and class exports ([060f714](https://github.com/julienandreu/zod-codegen/commit/060f714))
- refactor: improve build configuration and class exports ([b8771ad](https://github.com/julienandreu/zod-codegen/commit/b8771ad))
- refactor: remove tsconfig.build.json and use tsconfig.json directly ([407c46a](https://github.com/julienandreu/zod-codegen/commit/407c46a))
- chore: restore yarn.lock for yarn 4 with corepack ([a93f018](https://github.com/julienandreu/zod-codegen/commit/a93f018))
- chore(deps): bump tar from 7.5.1 to 7.5.2 ([b867dce](https://github.com/julienandreu/zod-codegen/commit/b867dce))

## 1.4.0 (2025-12-01)

- Merge pull request #40 from julienandreu/feat/naming-conventions-and-improvements ([d7c8146](https://github.com/julienandreu/zod-codegen/commit/d7c8146)), closes [#40](https://github.com/julienandreu/zod-codegen/issues/40)
- feat: add naming convention support and code quality improvements ([3ec8824](https://github.com/julienandreu/zod-codegen/commit/3ec8824))
- feat: add naming convention support for operation IDs ([0a52f14](https://github.com/julienandreu/zod-codegen/commit/0a52f14))

## 1.3.0 (2025-11-24)

- Merge pull request #36 from julienandreu/dependabot/npm_and_yarn/dev-dependencies-16beb30ed0 ([3d85de4](https://github.com/julienandreu/zod-codegen/commit/3d85de4)), closes [#36](https://github.com/julienandreu/zod-codegen/issues/36)
- Merge pull request #37 from julienandreu/dependabot/npm_and_yarn/production-dependencies-e947a059e9 ([25bfc2e](https://github.com/julienandreu/zod-codegen/commit/25bfc2e)), closes [#37](https://github.com/julienandreu/zod-codegen/issues/37)
- Merge pull request #38 from julienandreu/dependabot/github_actions/actions/checkout-6 ([6377f8b](https://github.com/julienandreu/zod-codegen/commit/6377f8b)), closes [#38](https://github.com/julienandreu/zod-codegen/issues/38)
- Merge pull request #39 from julienandreu/migrate-zod-string-api-v4 ([472d53f](https://github.com/julienandreu/zod-codegen/commit/472d53f)), closes [#39](https://github.com/julienandreu/zod-codegen/issues/39)
- feat: migrate deprecated Zod string schema API to v4 ([b4461b4](https://github.com/julienandreu/zod-codegen/commit/b4461b4))
- ci(deps): bump actions/checkout from 5 to 6 ([45d007c](https://github.com/julienandreu/zod-codegen/commit/45d007c))
- chore(deps-dev): bump the dev-dependencies group with 3 updates ([644ecdc](https://github.com/julienandreu/zod-codegen/commit/644ecdc))
- chore(deps): bump zod in the production-dependencies group ([69b5694](https://github.com/julienandreu/zod-codegen/commit/69b5694))

## <small>1.2.2 (2025-11-19)</small>

- Merge pull request #35 from julienandreu/fix/generate-typescript-type-aliases ([b8d9250](https://github.com/julienandreu/zod-codegen/commit/b8d9250)), closes [#35](https://github.com/julienandreu/zod-codegen/issues/35)
- fix: generate TypeScript type aliases alongside Zod schemas ([7032a69](https://github.com/julienandreu/zod-codegen/commit/7032a69))

## <small>1.2.1 (2025-11-19)</small>

- Merge pull request #33 from julienandreu/fix/add-z-infer-to-response-types ([a14d81c](https://github.com/julienandreu/zod-codegen/commit/a14d81c)), closes [#33](https://github.com/julienandreu/zod-codegen/issues/33)
- fix: add z.infer to response types in generated methods ([c45ac77](https://github.com/julienandreu/zod-codegen/commit/c45ac77))

## 1.2.0 (2025-11-19)

- Merge pull request #31 from julienandreu/dependabot/npm_and_yarn/dev-dependencies-1dd8918b9f ([97ebb65](https://github.com/julienandreu/zod-codegen/commit/97ebb65)), closes [#31](https://github.com/julienandreu/zod-codegen/issues/31)
- Merge pull request #32 from julienandreu/feat/add-jsdoc-comments ([9e0d589](https://github.com/julienandreu/zod-codegen/commit/9e0d589)), closes [#32](https://github.com/julienandreu/zod-codegen/issues/32)
- feat: add JSDoc comments to generated API client methods ([4f42f97](https://github.com/julienandreu/zod-codegen/commit/4f42f97))
- chore(deps-dev): bump the dev-dependencies group with 3 updates ([43be1ab](https://github.com/julienandreu/zod-codegen/commit/43be1ab))

## <small>1.1.2 (2025-11-13)</small>

- Merge pull request #30 from julienandreu/fix/cli-strict-mode ([d098ac7](https://github.com/julienandreu/zod-codegen/commit/d098ac7)), closes [#30](https://github.com/julienandreu/zod-codegen/issues/30)
- fix: add strict mode to CLI to catch typos in arguments ([b5ad8aa](https://github.com/julienandreu/zod-codegen/commit/b5ad8aa))

## <small>1.1.1 (2025-11-13)</small>

- Merge pull request #29 from julienandreu/feat/server-configuration-and-examples ([c598b5a](https://github.com/julienandreu/zod-codegen/commit/c598b5a)), closes [#29](https://github.com/julienandreu/zod-codegen/issues/29)
- fix: clarify getBaseRequestOptions merging behavior ([13379fd](https://github.com/julienandreu/zod-codegen/commit/13379fd))
- fix: use z.union with z.literal for numeric enums instead of z.enum ([5e0c7ea](https://github.com/julienandreu/zod-codegen/commit/5e0c7ea))

## 1.1.0 (2025-11-13)

- Merge pull request #27 from julienandreu/docs/update-readme-reflect-changes ([3f6745e](https://github.com/julienandreu/zod-codegen/commit/3f6745e)), closes [#27](https://github.com/julienandreu/zod-codegen/issues/27)
- Merge pull request #28 from julienandreu/feat/server-configuration-and-examples ([49d523d](https://github.com/julienandreu/zod-codegen/commit/49d523d)), closes [#28](https://github.com/julienandreu/zod-codegen/issues/28)
- feat: add server configuration support and comprehensive examples ([31538ff](https://github.com/julienandreu/zod-codegen/commit/31538ff))
- docs: update README to reflect current implementation ([d52ed5f](https://github.com/julienandreu/zod-codegen/commit/d52ed5f))

## <small>1.0.3 (2025-11-12)</small>

- Merge pull request #26 from julienandreu/refactor/modernize-typescript-strict-mode ([fb7c1bf](https://github.com/julienandreu/zod-codegen/commit/fb7c1bf)), closes [#26](https://github.com/julienandreu/zod-codegen/issues/26)
- fix: improve package.json path resolution for all installation scenarios ([c509691](https://github.com/julienandreu/zod-codegen/commit/c509691))
- fix: read version dynamically from package.json instead of manifest ([dd32cb2](https://github.com/julienandreu/zod-codegen/commit/dd32cb2))

## <small>1.0.2 (2025-11-12)</small>

- Merge pull request #25 from julienandreu/refactor/modernize-typescript-strict-mode ([9614fbd](https://github.com/julienandreu/zod-codegen/commit/9614fbd)), closes [#25](https://github.com/julienandreu/zod-codegen/issues/25)
- chore: update package-lock.json and pin Node.js to 24.11.1 in CI ([b165b43](https://github.com/julienandreu/zod-codegen/commit/b165b43))
- ci: update workflows to use Node.js 24 only ([1b56ad8](https://github.com/julienandreu/zod-codegen/commit/1b56ad8))
- refactor: modernize TypeScript to strict mode and fix all linting errors ([0dc2911](https://github.com/julienandreu/zod-codegen/commit/0dc2911))

## <small>1.0.1 (2025-09-16)</small>

- Merge pull request #10 from julienandreu/dependabot/npm_and_yarn/eslint-config-prettier-10.1.8 ([d9b786c](https://github.com/julienandreu/zod-codegen/commit/d9b786c)), closes [#10](https://github.com/julienandreu/zod-codegen/issues/10)
- Merge pull request #11 from julienandreu/dependabot/npm_and_yarn/types/node-24.5.0 ([aef6e88](https://github.com/julienandreu/zod-codegen/commit/aef6e88)), closes [#11](https://github.com/julienandreu/zod-codegen/issues/11)
- Merge pull request #3 from julienandreu/dependabot/github_actions/actions/setup-node-5 ([62282bc](https://github.com/julienandreu/zod-codegen/commit/62282bc)), closes [#3](https://github.com/julienandreu/zod-codegen/issues/3)
- Merge pull request #4 from julienandreu/dependabot/github_actions/actions/checkout-5 ([979b29e](https://github.com/julienandreu/zod-codegen/commit/979b29e)), closes [#4](https://github.com/julienandreu/zod-codegen/issues/4)
- Merge pull request #5 from julienandreu/dependabot/github_actions/codecov/codecov-action-5 ([dddb7b0](https://github.com/julienandreu/zod-codegen/commit/dddb7b0)), closes [#5](https://github.com/julienandreu/zod-codegen/issues/5)
- Merge pull request #6 from julienandreu/dependabot/npm_and_yarn/dev-dependencies-77ad94e918 ([596b00f](https://github.com/julienandreu/zod-codegen/commit/596b00f)), closes [#6](https://github.com/julienandreu/zod-codegen/issues/6)
- Merge pull request #7 from julienandreu/dependabot/npm_and_yarn/zod-4.1.8 ([39eecb4](https://github.com/julienandreu/zod-codegen/commit/39eecb4)), closes [#7](https://github.com/julienandreu/zod-codegen/issues/7)
- Merge pull request #8 from julienandreu/dependabot/npm_and_yarn/apidevtools/swagger-parser-12.0.0 ([3507359](https://github.com/julienandreu/zod-codegen/commit/3507359)), closes [#8](https://github.com/julienandreu/zod-codegen/issues/8)
- Merge pull request #9 from julienandreu/dependabot/npm_and_yarn/undici-7.16.0 ([84d7c4a](https://github.com/julienandreu/zod-codegen/commit/84d7c4a)), closes [#9](https://github.com/julienandreu/zod-codegen/issues/9)
- fix: use z.url() and z.email() instead of substring types ([4ea5902](https://github.com/julienandreu/zod-codegen/commit/4ea5902))
- chore(deps-dev): bump @types/node from 22.18.3 to 24.5.0 ([33e823c](https://github.com/julienandreu/zod-codegen/commit/33e823c))
- chore(deps-dev): bump eslint-config-prettier from 9.1.0 to 10.1.8 ([79dc367](https://github.com/julienandreu/zod-codegen/commit/79dc367))
- chore(deps-dev): bump typescript-eslint in the dev-dependencies group ([907712a](https://github.com/julienandreu/zod-codegen/commit/907712a))
- chore(deps): bump @apidevtools/swagger-parser from 10.1.0 to 12.0.0 ([9abfbbe](https://github.com/julienandreu/zod-codegen/commit/9abfbbe))
- chore(deps): bump undici from 6.21.3 to 7.16.0 ([43c579b](https://github.com/julienandreu/zod-codegen/commit/43c579b))
- chore(deps): bump zod from 3.25.76 to 4.1.8 ([5b7e047](https://github.com/julienandreu/zod-codegen/commit/5b7e047))
- ci(deps): bump actions/checkout from 4 to 5 ([3f141f7](https://github.com/julienandreu/zod-codegen/commit/3f141f7))
- ci(deps): bump actions/setup-node from 4 to 5 ([cc4a331](https://github.com/julienandreu/zod-codegen/commit/cc4a331))
- ci(deps): bump codecov/codecov-action from 4 to 5 ([c0a4ea5](https://github.com/julienandreu/zod-codegen/commit/c0a4ea5))

## 1.0.0 (2025-09-16)

- chore: fix husky deprecation warnings and improve ci/cd ([fe24d72](https://github.com/julienandreu/zod-codegen/commit/fe24d72))
- Merge pull request #1 from julienandreu/feat/clean-version ([bb2d67e](https://github.com/julienandreu/zod-codegen/commit/bb2d67e)), closes [#1](https://github.com/julienandreu/zod-codegen/issues/1)
- Merge pull request #2 from julienandreu/feat/allow-autopublish ([89a3e0a](https://github.com/julienandreu/zod-codegen/commit/89a3e0a)), closes [#2](https://github.com/julienandreu/zod-codegen/issues/2)
- feat: add array type support ([78bb87f](https://github.com/julienandreu/zod-codegen/commit/78bb87f))
- feat: add discriminator + smart sort ([34ca600](https://github.com/julienandreu/zod-codegen/commit/34ca600))
- feat: add encoding helpers for object, string, integer and boolean types ([436c688](https://github.com/julienandreu/zod-codegen/commit/436c688))
- feat: add helper client generation ([2761cb0](https://github.com/julienandreu/zod-codegen/commit/2761cb0))
- feat: add prettier configuration ([c1e2e01](https://github.com/julienandreu/zod-codegen/commit/c1e2e01))
- feat: add quick example ([3f3b8fa](https://github.com/julienandreu/zod-codegen/commit/3f3b8fa))
- feat: add zod openapi schema validation ([164b032](https://github.com/julienandreu/zod-codegen/commit/164b032))
- feat: clean version ([6033692](https://github.com/julienandreu/zod-codegen/commit/6033692))
- feat: complete requestBody processing ([5ca5e8f](https://github.com/julienandreu/zod-codegen/commit/5ca5e8f))
- feat: implement all parameters for paths ([e87875e](https://github.com/julienandreu/zod-codegen/commit/e87875e))
- feat: implement makeApiRequest private method ([7a4d52f](https://github.com/julienandreu/zod-codegen/commit/7a4d52f))
- feat: improve developer experience ([77776c1](https://github.com/julienandreu/zod-codegen/commit/77776c1))
- feat: improve developer experience ([1baacff](https://github.com/julienandreu/zod-codegen/commit/1baacff))
- feat: improve generator ([6beda59](https://github.com/julienandreu/zod-codegen/commit/6beda59))
- feat: improve schemas definition and sorting ([5367abd](https://github.com/julienandreu/zod-codegen/commit/5367abd))
- feat: initial commit ([b6e0c3a](https://github.com/julienandreu/zod-codegen/commit/b6e0c3a))
- feat: rebuild from scratch ([1192189](https://github.com/julienandreu/zod-codegen/commit/1192189))
- feat: start endpoint helpers implementation ([e7a16a1](https://github.com/julienandreu/zod-codegen/commit/e7a16a1))
- feat: use library to parse openapi specifications ([937f265](https://github.com/julienandreu/zod-codegen/commit/937f265))
