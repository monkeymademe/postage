-- Postage Database Schema
-- This is the consolidated schema for the Postage application
-- Run this file to create a fresh database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- POSTS TABLE
-- =====================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source_url VARCHAR(500),
    featured_image VARCHAR(500),
    hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- PLATFORM CONFIG TABLE
-- =====================
CREATE TABLE platform_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    profile_type VARCHAR(20) DEFAULT 'social',
    -- Text/Social profile settings
    max_length INTEGER,
    min_length INTEGER,
    hook_length INTEGER,
    include_hashtags BOOLEAN DEFAULT FALSE,
    hashtag_count INTEGER DEFAULT 0,
    include_photos BOOLEAN DEFAULT FALSE,
    avoid_header_generation BOOLEAN DEFAULT FALSE,
    single_line_content BOOLEAN DEFAULT FALSE,
    is_video_script BOOLEAN DEFAULT FALSE,
    -- Script/Video profile settings
    min_duration_seconds INTEGER,
    max_duration_seconds INTEGER,
    min_scenes INTEGER,
    max_scenes INTEGER,
    narrator_on_camera BOOLEAN DEFAULT FALSE,
    -- Shared settings
    tone VARCHAR(100),
    style VARCHAR(100),
    custom_instructions TEXT,
    utm_source VARCHAR(100),
    utm_enabled BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

CREATE INDEX idx_platform_config_user_id ON platform_config(user_id);
CREATE INDEX idx_platform_config_platform ON platform_config(platform);

CREATE TRIGGER update_platform_config_updated_at
    BEFORE UPDATE ON platform_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- GENERATED CONTENT TABLE
-- =====================
CREATE TABLE generated_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, platform)
);

CREATE INDEX idx_generated_content_post_id ON generated_content(post_id);
CREATE INDEX idx_generated_content_platform ON generated_content(platform);

CREATE TRIGGER update_generated_content_updated_at
    BEFORE UPDATE ON generated_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- GHOST SITES TABLE
-- =====================
CREATE TABLE ghost_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    api_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ghost_sites_user_id ON ghost_sites(user_id);

CREATE TRIGGER update_ghost_sites_updated_at
    BEFORE UPDATE ON ghost_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- TRACKING URLS TABLE
-- =====================
CREATE TABLE tracking_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    short_code VARCHAR(20) NOT NULL UNIQUE,
    original_url VARCHAR(500) NOT NULL,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, platform)
);

CREATE INDEX idx_tracking_urls_post_id ON tracking_urls(post_id);
CREATE INDEX idx_tracking_urls_platform ON tracking_urls(platform);
CREATE INDEX idx_tracking_urls_short_code ON tracking_urls(short_code);

CREATE TRIGGER update_tracking_urls_updated_at
    BEFORE UPDATE ON tracking_urls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- CLICK EVENTS TABLE
-- =====================
CREATE TABLE click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_url_id UUID NOT NULL REFERENCES tracking_urls(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer VARCHAR(500),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_click_events_tracking_url_id ON click_events(tracking_url_id);
CREATE INDEX idx_click_events_clicked_at ON click_events(clicked_at);

-- =====================
-- SYSTEM SETTINGS TABLE
-- =====================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(key);

CREATE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
