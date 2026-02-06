# Database Schema

This folder contains the database schema for the Postage application.

## Files

- `schema.sql` - The complete database schema for fresh installations

## Fresh Installation

To create a new database with the schema:

```bash
# Create the database
sudo -u postgres createdb postage

# Apply the schema
sudo -u postgres psql -d postage -f schema.sql
```

## Tables

- **users** - User accounts and authentication
- **posts** - Blog posts/content to be promoted
- **platform_config** - Content profile settings (character limits, tone, style, etc.)
- **generated_content** - AI-generated content for each platform
- **ghost_sites** - Ghost CMS site connections
- **tracking_urls** - URL tracking for analytics
- **click_events** - Click tracking data
- **system_settings** - Application-wide settings (LLM configuration, etc.)
