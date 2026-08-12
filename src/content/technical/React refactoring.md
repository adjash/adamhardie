---
title: React class components to functional components using hooks
author: Adam Hardie
description: "This is a technical discussion, outlining the migration process from a react class based, multi-step booking wizard, which was migrated to a functional component using various multiple new react features, hooks context and more!"
pubDate: 2026-08-11
tags:
  [
    "react",
    "hooks",
    "functional components",
    "class components",
    "context",
    "reducer",
    "state",
  ]
---

Recently in work, I've been working on the migration of a booking funnel, which was written around 8 years ago. I think in theory, there wasn't anything wrong with this, except there was certain inefficiencies which made it a bit tricky to maintain.

### Kitchen sink class

Essentially, the entire react app was written with a class based component, which was in charge of UI state, API calls, error states, prop drilling, routing and much more. It was difficult to look at, at a glance, and know immediately what was happening.
