/**
 * ESLint flat configuration.
 *
 * Every rule here enforces a principle of `.specify/memory/constitution.md` so that the code
 * quality standard is checked by a machine, not left to review:
 * - I    strict TypeScript, no `any`;
 * - XII  no magic numbers, exhaustive switches, documented exports, no `console`, short and flat
 *        functions, no import cycles;
 * - XIII no raw visual values (hex colours, px/ms strings, arbitrary Tailwind values) in UI code.
 */
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

/** Numbers allowed without a named constant (identity values and array index arithmetic). */
const ALLOWED_LITERAL_NUMBERS = [0, 1, -1];

/** Maximum statement nesting depth (constitution XII). */
const MAX_DEPTH = 3;

/** Maximum lines per function in `.ts` files (constitution XII). */
const MAX_FUNCTION_LINES = 40;

/** Maximum lines per function in `.tsx` components, JSX included (constitution XII). */
const MAX_COMPONENT_LINES = 80;

/**
 * Selectors rejecting raw visual values in UI code (constitution XIII): hex colours, `px`/`ms`
 * strings and Tailwind arbitrary values such as `w-[13px]`. Those values belong to `lib/theme/`.
 */
const RAW_VISUAL_VALUE_SELECTORS = [
  {
    selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
    message: "Raw hex colour: use a theme token from lib/theme (constitution XIII).",
  },
  {
    selector: "Literal[value=/\\b\\d+(\\.\\d+)?(px|ms|rem)\\b/]",
    message: "Raw size or duration: use a theme token from lib/theme (constitution XIII).",
  },
  {
    selector: "Literal[value=/\\w-\\[[^\\]]+\\]/]",
    message: "Arbitrary Tailwind value: add a token to lib/theme instead (constitution XIII).",
  },
  {
    selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b|\\b\\d+(px|ms|rem)\\b|\\w-\\[[^\\]]+\\]/]",
    message: "Raw visual value in a template string: use a theme token (constitution XIII).",
  },
];

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "lib/api/schema.d.ts",
      "components/ui/**",
      "*.config.mjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      "import-x": importX,
      jsdoc,
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // App Router only: there is no `pages/` directory to check links against.
      "@next/next/no-html-link-for-pages": "off",

      // Principle I — strict TypeScript.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",

      // Principle XII — no magic numbers, exhaustive switches, explicit boundaries.
      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: ALLOWED_LITERAL_NUMBERS,
          ignoreArrayIndexes: true,
          ignoreEnums: true,
          ignoreReadonlyClassProperties: true,
          ignoreNumericLiteralTypes: true,
          ignoreTypeIndexes: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "typeLike", format: ["PascalCase"] },
        { selector: "enumMember", format: ["UPPER_CASE"] },
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        { selector: "function", format: ["camelCase", "PascalCase"] },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "no-console": "error",
      "max-depth": ["error", MAX_DEPTH],
      "max-lines-per-function": [
        "error",
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true },
      ],
      "no-nested-ternary": "error",
      "import-x/no-cycle": "error",

      // Principle XII — documented exports.
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          contexts: [
            "ExportNamedDeclaration > VariableDeclaration",
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
            "ExportNamedDeclaration > TSInterfaceDeclaration",
            "ExportNamedDeclaration > TSEnumDeclaration",
          ],
        },
      ],
      "jsdoc/require-param": ["error", { checkDestructured: false }],
      "jsdoc/require-returns": ["error", { checkGetters: false }],
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/check-tag-names": ["error", { definedTags: ["see", "remarks"] }],
    },
  },
  {
    // Components may be longer because JSX counts as lines (constitution XII).
    files: ["**/*.tsx"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: MAX_COMPONENT_LINES, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // Principle XIII — UI code consumes theme tokens only.
    files: ["components/**/*.{ts,tsx}", "features/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
    ignores: ["components/ui/**"],
    rules: {
      "no-restricted-syntax": ["error", ...RAW_VISUAL_VALUE_SELECTORS],
    },
  },
  {
    // The theme configuration IS the named-constant table of every visual value
    // (constitution XIII): each value is documented by its key, e.g. `motion.normal.easing`.
    files: ["lib/theme/theme.config.ts"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
    },
  },
  {
    // Tests: literal values are the point of a test case.
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "max-lines-per-function": "off",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
