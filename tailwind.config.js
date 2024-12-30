/** @type {import('tailwindcss').Config} */



export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // or 'media' or 'class'
  theme: {
    extend: {
      animation: {
        bounceSlow: 'bounce 3s infinite',
        fadeIn: 'fadeIn 2s ease-in forwards',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      colors: {  
        primaryBlue1: "#1d99ff",
        primaryGreen1: "#14FF00",
        test:'#00C2FF',

        primaryColor1: "#00260A",
        primaryColor2: "#00591B",
        primaryColor3: "#028B34",
        primaryColor4: "#09BD56",
        primaryColor5: "#1AF081",
        primaryColor6: "#50F9AB",
        primaryColor7: "#86FDCE",
        primaryColor8: "#BDFFE8",
        primaryColor9: "#F2FFFB",
        
        dPrimaryColor1: "#FFF5F2",
        dPrimaryColor2: "#FBF3F2",
        dPrimaryColor3: "#DFDADA",
        dPrimaryColor4: "#939292",
        dPrimaryColor5: "#000000",
        dPrimaryColor6: "#0A0808",
        dPrimaryColor7: "#131010",
        dPrimaryColor8: "#1D1717",
        dPrimaryColor9: "#261F1F",
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
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none', /* IE and Edge */
          'scrollbar-width': 'none', /* Firefox */
        },
        '.scrollbar-hide::-webkit-scrollbar': {
          display: 'none', /* Chrome, Safari, and Opera */
        },
      });
    },
  ],
};
