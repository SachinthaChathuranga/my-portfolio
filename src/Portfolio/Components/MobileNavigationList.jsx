import React from "react";
import { IoCloseOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

const listStyle =
  "text-center py-3 border-2 border-primaryBlue1 rounded-lg mb-2 text-primaryBlue1";

function MobileNavigationList({ handleClose }) {
  const navigate = useNavigate();
  return (
    <div className=" fixed z-50 w-screen h-screen p-4 bg-white dark:bg-black">
      <div className="flex justify-end w-full text-primaryBlue1 text-3xl">
        <IoCloseOutline onClick={handleClose} />
      </div>
      <ul className="px-7">
        <li
          className={listStyle}
          onClick={() => {
            handleClose();
            navigate("/my-portfolio/", {state: {id: "home"}});
          }}
        >
          Home
        </li>
        <li
          className={listStyle}
          onClick={() => {
            handleClose();
            navigate("/my-portfolio/projects");
          }}
        >
          Projects
        </li>
        <li
          className={listStyle}
          onClick={() => {
            handleClose();
            navigate("/my-portfolio/", { state: { id: "about" } });
          }}
        >
          {/* () => navigate('/', { state: { id: 'about' } }) */}
          About
        </li>
        <li
          className={listStyle}
          onClick={() => {
            handleClose();
            navigate("/my-portfolio/blog");
          }}
        >
          Blog
        </li>
      </ul>
    </div>
  );
}

export default MobileNavigationList;
