import { createContext, useState, useMemo } from "react";

export const DarkModeContext = createContext();

export const DarkModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false); // default: light mode

  const value = useMemo(() => ({
    darkMode,
    toggleDarkMode: () => setDarkMode((prev) => !prev),
  }), [darkMode]);

  return (
    <DarkModeContext.Provider value={value}>
      {children}
    </DarkModeContext.Provider>
  );
};
