import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default tseslint.config(
	{
		ignores: [
			"dist/**",
			"node_modules/**",
			"coverage/**",
			"test-results/**",
			"playwright-report/**",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
		},
		rules: {
			// Block direct Tailwind colors - force AM Design System tokens
			"no-restricted-syntax": [
				"warn",
				{
					selector:
						"Literal[value=/\\b(bg|text|border)-(emerald|purple|violet|rose|amber|blue|indigo|teal|cyan|lime|green|yellow|orange|red|pink|fuchsia|sky|slate|gray|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900)\\b/]",
					message:
						"❌ Используйте AM Design System токены вместо прямых Tailwind цветов. Например: text-am-brand вместо text-blue-600, bg-am-success вместо bg-emerald-500",
				},
			],
			// Warn on small touch targets
			"no-warning-comments": [
				"warn",
				{
					terms: ["TODO", "FIXME", "XXX"],
					location: "start",
				},
			],
			"no-undef": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-unused-expressions": "warn",
			"no-empty": "warn",
			"prefer-const": "warn",
		},
	},
);
