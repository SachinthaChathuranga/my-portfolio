import React from "react";
import { IoCloseOutline } from "react-icons/io5";
import ProjectRow from "../Projects/ProjectRow";

function PopupWindow({ closePopupWindow, project }) {
  const projectDetails = Object.entries(project);

  return (
    <div className="bg-black inset-0 fixed bg-opacity-30 backdrop-blur-sm flex justify-center items-center py-24 px-5 sm:px-60">
      <div className="bg-white dark:bg-black h-full w-full rounded-3xl shadow-2xl py-1 pb-10 px-2 ">
        <div className="flex justify-end w-full">
          <IoCloseOutline
            className="text-3xl hover:text-primaryBlue1 cursor-pointer"
            onClick={closePopupWindow}
          />
        </div>
        <div className="p-5 max-h-full b overflow-y-auto ">
          {projectDetails.map(([key, value]) => (
            <ProjectRow
              key={key}
              title={key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())} // Format key to be more readable
              details={
                Array.isArray(value) ? value.join(", ") : value.toString()
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PopupWindow;
