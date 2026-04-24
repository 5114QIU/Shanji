-- 为 dramas 表添加 reflections 字段，用于存储语音感悟
-- 这是一个 JSONB 数组，包含所有感悟记录

-- 添加 reflections 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'dramas' 
        AND column_name = 'reflections'
    ) THEN
        ALTER TABLE dramas ADD COLUMN reflections JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 添加注释
COMMENT ON COLUMN dramas.reflections IS '存储用户的语音感悟记录，格式为 JSON 数组';

-- 创建索引以提高查询性能（可选）
CREATE INDEX IF NOT EXISTS idx_dramas_reflections ON dramas USING GIN (reflections);
