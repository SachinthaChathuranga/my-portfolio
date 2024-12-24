import React from "react";

function FrameWork({ name }) {
  return (
    <div className="bg-primaryColor6 dark:bg-dPrimaryColor6 text-primaryColor2 dark:text-dPrimaryColor4 px-5 rounded-xl m-1 ">
      {name}
    </div>
  );
}

export default FrameWork;
