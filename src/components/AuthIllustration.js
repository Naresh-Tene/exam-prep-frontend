import React from "react";

// Image from public folder (examprep.png)
const AUTH_IMAGE = "/examprep.png";

export default function AuthIllustration() {
  return (
    <img
      src={AUTH_IMAGE}
      alt=""
      style={{
        maxWidth: "100%",
        maxHeight: "80vh",
        objectFit: "contain",
      }}
      aria-hidden="true"
    />
  );
}
