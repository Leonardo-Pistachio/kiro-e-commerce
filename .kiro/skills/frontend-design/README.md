# Frontend Design Skill

This is the Anthropic Frontend Design skill, installed locally in your Kiro project.

## What it does

The **frontend-design** skill guides Claude toward creating distinctive, intentional visual interfaces rather than defaulting to common AI-generated design patterns. It teaches Claude to:

- Ground designs in subject matter and user context
- Make deliberate choices about typography, color, and layout
- Avoid common AI design tells (cream backgrounds with terracotta accents, SaaS card kits, etc.)
- Plan designs before building (color palette, typography, layout, principles)
- Write intentional copy that serves the interface, not decorates it
- Use motion sparingly and deliberately
- Critique work for accessibility and responsive design

## How to use it

You can activate this skill by mentioning it in your request:

```
Use the frontend-design skill to create a landing page for an AI security startup.
Build a dashboard for a music streaming app using the frontend-design skill.
```

Or reference it when asking for UI work:

```
Create a dashboard for a music streaming app.
- Product: Browse and play music from your library
- Stack: React + Tailwind CSS
- Must include: Search, playlists, player controls
- Use frontend-design

Before writing code, list your color, type, and layout choices and explain how each fits the subject.
```

## Key principles

1. **Ground in subject matter** - Understand what's being built before designing
2. **Plan before building** - Create a design token system (colors, type, layout, principles)
3. **Avoid defaults** - Don't use generic patterns unless they truly fit the brief
4. **Typography matters** - Use 1-2 font families deliberately, keep line length under 80 chars
5. **Motion is intentional** - Only animate to respond to user actions or draw attention
6. **Copy is design** - Write clearly and actively ("Save changes" not "Submit")
7. **Critique yourself** - Take screenshots, review for accessibility, ensure responsive design

## Design antipatterns to avoid

The skill specifically warns against these common AI-generated design clusters:

- Cream backgrounds (#F4F1EA) with terracotta accents (#D97757)
- Near-black backgrounds with acid-green or vermilion accents
- Broadsheet layouts with hairline rules and dense columns
- SaaS card kits (identical rounded cards with soft shadows)
- Template chrome (ALL-CAPS eyebrows, middle-dot meta strings, tracked spacing)

## Installation source

This skill is from [Anthropic's official skills repository](https://github.com/anthropics/skills). It's available under Apache 2.0 license and is also available as a Claude Code plugin in Anthropic's official marketplace.

For more information, see:
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [Claude Frontend Design Skill Documentation](https://dev.to/skillgild/claudes-frontend-design-skill-what-it-does-with-a-real-run-5alm)
