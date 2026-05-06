# Chrome Web Store Listing — CH Navigator

Copy/paste these into the Developer Dashboard fields.

## Name
CH Navigator

## Summary (132 chars max)
Quick navigation links for Sitecore Content Hub. Jump to users, schema, scripts, triggers and more in the current tenant.

## Detailed description
CH Navigator is a small productivity extension for teams working in Sitecore Content Hub.

When you click the extension icon on a Content Hub tab, it detects your current tenant and shows a categorized list of common destinations — user management, schema, entity management, scripts, triggers, settings, and more. Each link opens in a new tab against the tenant you're already working in, so you don't have to remember paths or maintain bookmarks per environment.

Features:
- Auto-detects the active Content Hub tenant from the current tab.
- One-click navigation to frequently used admin pages.
- Sectioned, collapsible list (Navigation, API Links, Configurations).
- No accounts, no tracking, no external servers.

The extension reads only the URL of the active tab, and only when you click the icon, so it can build links against the right tenant. Nothing is stored or transmitted.

Tested with `*.sitecorecontenthub.cloud` tenants.

## Category
Productivity

## Language
English

## activeTab justification
The extension needs the active tab's URL to determine the Content Hub tenant origin (e.g. https://acme.sitecorecontenthub.cloud) so that navigation links can be built against the same tenant. No other tab data is accessed.

## Single purpose justification
The extension has one purpose: help users navigate to common pages within the Sitecore Content Hub tenant they currently have open.

## Data usage disclosure
- Does NOT collect personally identifiable information.
- Does NOT collect health, financial, authentication, personal communications, location, web history, or user activity data.
- Does NOT sell or transfer user data to third parties.
- Does NOT use data for purposes unrelated to the single purpose.
- Does NOT use data to determine creditworthiness or for lending.

## Privacy policy URL
(Host PRIVACY.md as a public URL — e.g. GitHub Pages, or the raw GitHub link will work.)
