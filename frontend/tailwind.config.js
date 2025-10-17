/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./src/app/**/*.{js,jsx}",
		"./src/components/**/*.{js,jsx}",
		"./src/pages/**/*.{js,jsx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "ui-sans-serif", "system-ui"],
			},
			colors: {
				primary: "#6366F1",
				secondary: "#8B5CF6",
				accent: "#A78BFA",
			},
		},
	},
	plugins: [],
};

