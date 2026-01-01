-- scripts/migrations/001-create-tables.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'vendor', 'admin')),
    preferences JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Provinces table
CREATE TABLE IF NOT EXISTS provinces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry JSONB,
    history TEXT,
    population INTEGER DEFAULT 0,
    capital VARCHAR(255),
    languages TEXT[] DEFAULT ARRAY[]::TEXT[],
    attractions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provinces_name ON provinces(name);

-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    languages TEXT[] DEFAULT ARRAY['fr'],
    author VARCHAR(255),
    image_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    views INTEGER DEFAULT 0,
    published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_news_published ON news_articles(published);
CREATE INDEX idx_news_created_at ON news_articles(created_at DESC);
CREATE INDEX idx_news_views ON news_articles(views DESC);
CREATE INDEX idx_news_search ON news_articles USING gin(to_tsvector('simple', title || ' ' || content));

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    venue VARCHAR(255) NOT NULL,
    location JSONB,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    price_cents INTEGER NOT NULL,
    capacity INTEGER DEFAULT 0,
    tickets_sold INTEGER DEFAULT 0,
    category VARCHAR(100),
    image_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_start_at ON events(start_at);
CREATE INDEX idx_events_category ON events(category);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    holder_name VARCHAR(255) NOT NULL,
    holder_email VARCHAR(255) NOT NULL,
    purchase_id UUID NOT NULL,
    seat_info JSONB,
    qr_code TEXT,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_purchase_id ON tickets(purchase_id);
CREATE INDEX idx_tickets_holder_email ON tickets(holder_email);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    image_url TEXT,
    vendor_id UUID REFERENCES users(id),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_available ON products(available);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    vendor_id UUID,
    total_cents INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    items JSONB NOT NULL,
    delivery_address JSONB,
    payment_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Traffic data table
CREATE TABLE IF NOT EXISTS traffic_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_id INTEGER REFERENCES provinces(id),
    location JSONB NOT NULL,
    road_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('clear', 'moderate', 'heavy', 'blocked')),
    speed_kmh INTEGER DEFAULT 0,
    incidents JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traffic_province ON traffic_data(province_id);
CREATE INDEX idx_traffic_created_at ON traffic_data(created_at DESC);
CREATE INDEX idx_traffic_road_name ON traffic_data(road_name);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'BIF',
    method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB,
    external_reference VARCHAR(255),
    order_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- AI interactions table
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    input JSONB NOT NULL,
    output JSONB NOT NULL,
    language VARCHAR(10) DEFAULT 'fr',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_type ON ai_interactions(type);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at DESC);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
