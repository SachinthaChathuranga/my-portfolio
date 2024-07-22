import React, { useState, useEffect } from "react";

function SkillsField({ title, percentage }) {
  const [width, setWidth] = useState("0%");

  useEffect(() => {
    // Update width when percentage prop changes
    setWidth(percentage);
  }, [percentage]);

  return (
    <div className="mb-4">
      <h1>{title}</h1>
      <div className="w-full h-2 bg-primaryBlue1 rounded-full">
        <div
          className="h-2 rounded-full bg-black dark:bg-white"
          style={{ width: width, transition: "width 1s ease-in-out" }}
        ></div>
      </div>
    </div>
  );
}

export default SkillsField;
