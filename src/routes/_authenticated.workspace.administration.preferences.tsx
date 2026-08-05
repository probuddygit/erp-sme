import { createFileRoute } from "@tanstack/react-router";
import { SettingsForm } from "@/features/admin/SettingsForm";

export const Route = createFileRoute("/_authenticated/workspace/administration/preferences")({
  component: () => (
    <SettingsForm settingsKey="admin.preferences" groups={[
      { title: "Appearance", fields: [
        { name: "theme", label: "Theme", type: "select", default: "system", options: [
          { label: "Light", value: "light" }, { label: "Dark", value: "dark" }, { label: "Follow system", value: "system" },
        ] },
        { name: "compact", label: "Compact density", type: "switch", default: false },
        { name: "high_contrast", label: "High-contrast mode", type: "switch", default: false },
      ] },
      { title: "Regional format", fields: [
        { name: "language", label: "Language", type: "select", default: "en", options: [
          { label: "English", value: "en" }, { label: "हिन्दी", value: "hi" },
        ] },
        { name: "date_format", label: "Date format", type: "select", default: "dmy", options: [
          { label: "DD-MM-YYYY", value: "dmy" }, { label: "MM/DD/YYYY", value: "mdy" }, { label: "YYYY-MM-DD", value: "ymd" },
        ] },
        { name: "currency_format", label: "Currency format", type: "select", default: "lakh", options: [
          { label: "Indian (Lakh, Crore)", value: "lakh" }, { label: "International", value: "intl" },
        ] },
        { name: "timezone", label: "Timezone", default: "Asia/Kolkata (IST)" },
      ] },
      { title: "Defaults", fields: [
        { name: "landing_page", label: "Landing page", type: "select", default: "dashboard", options: [
          { label: "Dashboard", value: "dashboard" }, { label: "Sales", value: "sales" },
          { label: "Procurement", value: "procurement" }, { label: "Inventory", value: "inventory" },
        ] },
        { name: "rows_per_page", label: "Rows per page", type: "number", default: 25 },
        { name: "auto_save_drafts", label: "Auto-save drafts", type: "switch", default: true },
      ] },
      { title: "Notifications", fields: [
        { name: "digest", label: "Daily digest", type: "switch", default: true },
        { name: "digest_time", label: "Digest time", default: "09:00 IST" },
        { name: "sound", label: "In-app sound", type: "switch", default: false },
      ] },
    ]} />
  ),
});
