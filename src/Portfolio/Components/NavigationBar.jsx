import React, { useEffect, useState } from "react";
import { CiMenuFries } from "react-icons/ci";
import MobileNavigationList from "./MobileNavigationList";
import { useNavigate } from "react-router-dom";

const Moon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
  </svg>
);

const Sun = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
      clipRule="evenodd"
    />
  </svg>
);

const listStyle = "px-10 font-bold cursor-pointer hover:text-primaryBlue1";

function NavigationBar() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVisibleMobile, setIsVisibleMobile] = useState(false);
  const navigate = useNavigate()

  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      window.document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

 
  const handleClick = () => {

    if (isDarkMode) {
      window.document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      localStorage.setItem("theme", "dark");
      window.document.documentElement.classList.add("dark");
    }
    setIsDarkMode(!isDarkMode);
  };

  function handleClickMenu() {
    console.log("opened");
    setIsVisibleMobile(true);
  }

  function handleClickClose() {
    console.log("closed");
    setIsVisibleMobile(false);
  }

  const handleNavigation = (path, id) => {
    navigate(path, { state: { id } });
  };

  return (
    <div className="fixed w-screen  px-5 sm:px-0 bg-white  dark:bg-black flex justify-between sm:justify-around py-4 text-lg overflow-clip">
      <div className="">
        <h1 className="text-primaryBlue1 "> Mr.SMSC</h1>
      </div>
      <div>
        <ul className="hidden sm:flex">
          <li className={listStyle} onClick={() => handleNavigation('/my-portfolio/', 'home')} >Home</li>
          {/* <li className={listStyle} onClick={() => navigate('/', { state: { id: 'about' } })} >About</li> */}
          <li className={listStyle} onClick={() => navigate('/my-portfolio/projects')} >Projects</li>
          <li className={listStyle} onClick={() => handleNavigation('/my-portfolio/', 'about')} >About</li>
          <li className={listStyle} onClick={() => navigate('/my-portfolio/blog')}  >Blog</li>
        </ul>
      </div>
      <div>
        <div className="flex">
          <button
            className="text-gray-400 hover:bg-slate-200 p-1 flex items-center justify-center rounded-md dark:hover:bg-slate-700"
            onClick={handleClick}
            aria-label={`Toggle ${isDarkMode ? "light" : "dark"} mode`}
          >
            {isDarkMode ? <Sun /> : <Moon />}
          </button>
          <div className="py-1 pl-5 sm:hidden">
            <CiMenuFries
              className="text-primaryBlue1"
              onClick={handleClickMenu}
            />
          </div>
        </div>
      </div>
      {isVisibleMobile && (
        <div className="absolute top-0 left-0 z-50 w-full h-screen ">
          <MobileNavigationList handleClose={handleClickClose} />
        </div>
      )}
    </div>
  );
}

export default NavigationBar;
