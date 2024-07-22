import React, { useState } from "react";

function InputField({name, value}) {




  return (
    <div>
      <div>
        <div className="flex bg-[#1d99ff] rounded-full my-1 ">
          <div className="bg-black dark:bg-white dark:text-black text-white py-1 items-center flex p-1 px-5 w-40 justify-center rounded-full">{name}</div>
          <p className="text-end w-full py-1 pr-4">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default InputField;
