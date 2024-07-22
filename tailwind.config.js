/** @type {import('tailwindcss').Config} */



export default {
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class", // or 'media' or 'class'
  theme: {
    extend: {
      colors: {  
        primaryBlue1: "#1d99ff",
        primaryGreen1: "#14FF00",
        test:'#00C2FF'
      },

      fontFamily: {
        footFont1: ["Lalezar", "system-ui"],
        footFont2: ["Lilita One", "sans-serif"],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
