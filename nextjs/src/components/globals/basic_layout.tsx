"use client";

import { resolveUrl } from "@/components/globals/url/resolveUrl";
import { useAuth } from "@/context/AuthContext";
import { useWindowWidth } from "@/hooks/useWindowWidth";
import "@fortawesome/fontawesome-free/css/all.css";
import axios from "axios";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
// title of every web page

function MenuItem({
  icon,
  text,
  isVisible,
  action,
}: Readonly<{
  icon: string;
  text: string;
  isVisible: boolean;
  action: () => void;
}>) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={action}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-4 px-4 py-2 hover:bg-sky-600 cursor-pointer transition-all duration-300"
    >
      <i className={`fa fa-${icon} text-white text-lg`}></i>
      {isVisible && (
        <span className="text-white text-sm font-medium">{text}</span>
      )}
    </div>
  );
}

type BasicLayoutProps = {
  page_name: string;
  requiresAuth?: boolean;
  children?: ReactNode;
};

const headerHeight = 80 as const;
const expandedWidth = 130 as const;
const collapsedWidth = 50 as const;
const SM_BREAKPOINT = 640 as const;

export function BasicLayout({
  page_name,
  requiresAuth = true,
  children,
}: Readonly<BasicLayoutProps>) {
  const windowWidth = useWindowWidth();
  const [isVisible, setIsVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<0 | 50 | 130>(expandedWidth);

  const router = useRouter();
  const pathname = usePathname();
  const { auth, logout } = useAuth();
  async function handleLogout() {
    const url = resolveUrl("/api/auth/logout");
    try {
      await axios.post(url, undefined, { withCredentials: true });
    } catch (err) {
      console.error("Network error during logout:", err);
    }
    logout();
    console.log("Logged out");
    router.push("/");
    console.log("Redirected to home");
  }

  useEffect(() => {
    if (requiresAuth && !auth.loggedIn) {
      router.push(`/auth/login?from=${pathname}`);
    }
  }, [auth, pathname, requiresAuth, router]);

  useEffect(() => {
    setIsVisible(windowWidth >= SM_BREAKPOINT);
  }, [windowWidth]);

  const toggleSidebar = () => setIsVisible(!isVisible);

  useEffect(() => {
    if (auth.loggedIn) {
      setSidebarWidth(isVisible ? expandedWidth : collapsedWidth);
    } else {
      setSidebarWidth(0);
    }
  }, [isVisible, auth]);

  const showTitle = windowWidth >= SM_BREAKPOINT;

  return (
    <div
      className="grid min-h-screen w-full transition-all duration-300"
      style={{
        gridTemplateRows: `${headerHeight}px calc((100vh -  ${headerHeight}px))`,
        gridTemplateColumns: `${sidebarWidth}px calc((100vw - ${sidebarWidth}px))`,
        gridTemplateAreas: `
          "header header"
          "sidebar main"
        `,
      }}
    >
      {/* Header */}
      <header
        style={{ gridArea: "header" }}
        className=" col-span-2 bg-sky-500 shadow-md px-4 sm:px-8 flex items-center justify-between z-20"
      >
        <div className="flex items-center">
          <Image
            src="/images/logo1.png"
            alt="Logo"
            width="72"
            height="72"
            className="h-18 w-auto transition-all duration-300"
            onClick={() => router.push("/")}
          />
          {showTitle && (
            <h1 className="text-lg sm:text-xl font-bold text-white ml-4">
              Dive Together Log {page_name}
            </h1>
          )}
        </div>
        <div className="flex space-x-2 sm:space-x-3">
          {auth.loggedIn ? (
            <button
              className="bg-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-red-600 transition-colors"
              onClick={handleLogout}
            >
              Log Out
            </button>
          ) : (
            <>
              <button
                className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-blue-700 transition-colors"
                onClick={() => router.push("/auth/signup")}
              >
                Sign Up
              </button>
              <button
                className="bg-gray-200 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base hover:bg-gray-300 transition-colors"
                onClick={() => router.push("/auth/login")}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </header>
      {/* Sidebar */}
      {auth.loggedIn ? (
        <aside
          className="bg-sky-500 flex flex-col transition-all duration-300"
          style={{ width: sidebarWidth, gridArea: "sidebar" }}
        >
          <MenuItem
            icon="bars"
            text="Collapse"
            isVisible={isVisible}
            action={toggleSidebar}
          />
          <MenuItem
            icon="home"
            text="Home"
            isVisible={isVisible}
            action={() => router.push("/")}
          />
          <MenuItem
            icon="search"
            text="Search Dives"
            isVisible={isVisible}
            action={() => router.push("/dive/dive-selection")}
          />
          <MenuItem
            icon="pen-to-square"
            text="Upload Dive"
            isVisible={isVisible}
            action={() => router.push("/dive/create")}
          />
          <MenuItem
            icon="user-group"
            text="Groups"
            isVisible={isVisible}
            action={() => {
              router.push("/share/overview");
            }}
          />
          <MenuItem
            icon="user-pen"
            text="Profile"
            isVisible={isVisible}
            action={() => {
              router.push("/profile");
            }}
          />
          <MenuItem
            icon="map"
            text="Dive Sites"
            isVisible={isVisible}
            action={() => router.push("/map/createView")}
          />
        </aside>
      ) : (
        <div></div>
      )}
      {/* Main content */}
      <main
        className="transition-all duration-300 overflow-auto min-h-full min-w-full"
        style={{ gridArea: "main" }}
      >
        {children}
      </main>
    </div>
  );
}
