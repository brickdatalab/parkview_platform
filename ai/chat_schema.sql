-- ============================================
-- Parkview Platform - Chat Feature Migration
-- ============================================
-- Run this migration to add AI chat functionality
-- Integrates with existing auth.users and RLS patterns
-- 
-- Migration name suggestion: 20241210_add_chat_tables.sql
-- ============================================

-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
-- Stores chat sessions per user

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.conversations IS 'AI chat conversations for Parkview Assistant';
COMMENT ON COLUMN public.conversations.user_id IS 'FK to auth.users - owner of conversation';
COMMENT ON COLUMN public.conversations.title IS 'Auto-generated from first message or user-set';

-- Indexes for sidebar query performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_user_updated ON public.conversations(user_id, updated_at DESC);

-- ============================================
-- MESSAGES TABLE
-- ============================================
-- Stores individual messages within conversations

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comments
COMMENT ON TABLE public.messages IS 'Individual messages within AI chat conversations';
COMMENT ON COLUMN public.messages.role IS 'Message author: user, assistant, system, or tool';
COMMENT ON COLUMN public.messages.metadata IS 'Stores SQL queries executed, tool calls, tokens used, etc.';

-- Indexes for message retrieval
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);

-- ============================================
-- AUTO-UPDATE CONVERSATION TIMESTAMP
-- ============================================
-- Updates conversation.updated_at when new message added

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- ============================================
-- AUTO-TITLE FROM FIRST MESSAGE
-- ============================================
-- Sets conversation title from first user message (truncated to 50 chars)

CREATE OR REPLACE FUNCTION public.auto_title_conversation()
RETURNS TRIGGER AS $$
DECLARE
    msg_count INTEGER;
BEGIN
    -- Only for user messages
    IF NEW.role = 'user' THEN
        -- Check if this is the first user message
        SELECT COUNT(*) INTO msg_count
        FROM public.messages 
        WHERE conversation_id = NEW.conversation_id 
        AND role = 'user'
        AND id != NEW.id;
        
        -- If first user message, update title
        IF msg_count = 0 THEN
            UPDATE public.conversations 
            SET title = LEFT(NEW.content, 50) || 
                        CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
            WHERE id = NEW.conversation_id 
            AND title = 'New Conversation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_title_conversation
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_title_conversation();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
-- Follows same pattern as existing Parkview tables

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users only see their own
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Messages: Access via conversation ownership
CREATE POLICY "Users can view messages in own conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create messages in own conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id = auth.uid()
    )
);

-- ============================================
-- HELPER FUNCTION: Get conversation history
-- ============================================
-- Returns conversation with all messages for resuming chat

CREATE OR REPLACE FUNCTION public.get_conversation_history(conv_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    conversation_title TEXT,
    message_id UUID,
    role TEXT,
    content TEXT,
    metadata JSONB,
    message_created_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
    -- Verify user owns this conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conv_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Conversation not found or access denied';
    END IF;

    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        m.id,
        m.role,
        m.content,
        m.metadata,
        m.created_at
    FROM public.conversations c
    LEFT JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.id = conv_id
    ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER FUNCTION: List user's conversations
-- ============================================
-- For sidebar - returns recent conversations

CREATE OR REPLACE FUNCTION public.get_user_conversations(
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    updated_at TIMESTAMPTZ,
    message_count BIGINT
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.updated_at,
        COUNT(m.id) as message_count
    FROM public.conversations c
    LEFT JOIN public.messages m ON m.conversation_id = c.id
    WHERE c.user_id = auth.uid()
    GROUP BY c.id, c.title, c.updated_at
    ORDER BY c.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- OPTIONAL: Read-only SQL execution function
-- ============================================
-- For the AI agent to safely query the database
-- Uncomment and customize if needed

/*
CREATE OR REPLACE FUNCTION public.execute_readonly_query(sql TEXT)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validate it's a SELECT statement
    IF NOT (UPPER(TRIM(sql)) LIKE 'SELECT%') THEN
        RAISE EXCEPTION 'Only SELECT queries are allowed';
    END IF;
    
    -- Block dangerous keywords
    IF sql ~* '(DROP|DELETE|UPDATE|INSERT|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)' THEN
        RAISE EXCEPTION 'Query contains prohibited keywords';
    END IF;
    
    -- Execute and return as JSON
    EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql || ' LIMIT 1000) t'
    INTO result;
    
    RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_readonly_query(TEXT) TO authenticated;
*/

-- ============================================
-- GRANTS
-- ============================================
-- Standard grants for authenticated users

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(INTEGER) TO authenticated;
