import type { ThemePages } from "../ThemeContext";
import { Sidebar } from "../../components/oxygenu/Sidebar";
import { Home } from "../../components/oxygenu/Home";
import { Scripts } from "../../components/oxygenu/Scripts";
import { Clients } from "../../components/oxygenu/Clients";
import { Settings } from "../../components/oxygenu/Settings";

export const oxygenuPages: ThemePages = {
    Dashboard: Home as unknown as ThemePages["Dashboard"],
    Execute: Home as ThemePages["Execute"],
    Hub: Scripts as ThemePages["Hub"],
    Panel: Clients as ThemePages["Panel"],
    DLL: () => null,
    Logs: () => null,
    Settings,
    About: () => null,
    Sidebar,
};
